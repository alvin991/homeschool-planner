import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import {
  flattenLessonTree,
  generateLessonOccurrences,
  generateScheduledDates,
  computeSchedule,
} from '../lib/enrollmentUtils';
import { ISubject } from '@/models/Subject';
import Student from '@/models/Student';

export const enrollmentResolvers = {
  Query: {
    enrollment: async (_: unknown, { id }: { id: string }) => {
      return await Enrollment.findById(id).lean();
    },
    enrollments: async (_: unknown, { studentId }: { studentId: string }) => {
      return await Enrollment.find({ student: studentId }).lean();
    },
    previewEnrollmentSchedule: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          studentId: string;
          courseId: string;
          start_date: string;
          end_date?: string;
          weekdays?: Array<number>;
          week_interval?: 1 | 2;
          lesson_rate?: 0.25 | 0.5 | 1 | 2;
          status?: 'active' | 'completed' | 'dropped';
          suspension_periods?: Array<{ start: string; end: string }>;
        };
      }
    ) => {
      if ((input.weekdays ?? []).length === 0)
        throw new Error('At least one weekday must be selected');
      const student = await Student.findById(input.studentId).lean();
      const studentName = student?.name ?? '';
      const course = await Course.findById(input.courseId)
        .populate('subject')
        .lean();

      if (!course) throw new Error('Course not found');
      const subject = course.subject as unknown as ISubject;

      const { lessonSnapshots, lessonOccurrences, scheduledDates } =
        computeSchedule({
          course,
          weekdays: input.weekdays ?? [],
          week_interval: input.week_interval ?? 1,
          lesson_rate: input.lesson_rate ?? 1,
          start_date: input.start_date,
          end_date: input.end_date,
          suspension_periods: input.suspension_periods,
        });
      if (scheduledDates.length < lessonOccurrences.length)
        throw new Error(
          `Not enough scheduled days — ${scheduledDates.length} days available for ${lessonOccurrences.length} lessons`
        );

      const days = scheduledDates.map((date, i) => ({
        date: date.toISOString().slice(0, 10),
        studentName: studentName,
        lessons: lessonOccurrences[i].lessons.map((l) => {
          const snapshot = lessonSnapshots.find(
            (s) => s._id.toString() === l.lesson_id.toString()
          );
          return {
            lesson_id: l.lesson_id,
            sequence: lessonOccurrences[i].sequence,
            course_title: course.title,
            course_abbr: course.abbr,
            subject_color: subject.color,
            lesson_title: l.lesson_title,
            content: snapshot?.content ?? '',
            note: snapshot?.note ?? '',
            day_number: l.day_number,
            total_days: l.total_days,
            status: l.status,
          };
        }),
      }));

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      return { month: currentMonth, days };
    },
  },
  Mutation: {
    updateOccurrenceStatus: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          enrollmentId: string;
          lessonId: string;
          status: string;
          completedDate?: string;
        };
      }
    ) => {
      const { enrollmentId, lessonId, status, completedDate } = input;

      const enrollment = await Enrollment.findById(enrollmentId);
      if (!enrollment) throw new Error('Enrollment not found');

      const lesson = enrollment.lesson_occurrences
        .flatMap((o) => o.lessons)
        .find((l) => l.lesson_id.toString() === lessonId);
      if (!lesson) throw new Error('Lesson not found');

      lesson.status = status as 'pending' | 'completed' | 'skipped';
      lesson.completed_date =
        status === 'completed'
          ? completedDate
            ? new Date(completedDate)
            : new Date()
          : undefined;

      await enrollment.save();
      return true;
    },
    createEnrollment: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          studentId: string;
          courseId: string;
          start_date: string;
          end_date?: string;
          weekdays?: Array<number>;
          week_interval?: 1 | 2;
          lesson_rate?: 0.25 | 0.5 | 1 | 2;
          status?: 'active' | 'completed' | 'dropped';
          suspension_periods?: Array<{ start: string; end: string }>;
        };
      }
    ) => {
      const startDate = new Date(input.start_date);
      const endDate = input.end_date ? new Date(input.end_date) : undefined;
      const suspensionPeriods = (input.suspension_periods ?? []).map((p) => ({
        start: new Date(p.start),
        end: new Date(p.end),
      }));

      if ((input.weekdays ?? []).length === 0)
        throw new Error('At least one weekday must be selected');
      const course = await Course.findById(input.courseId).lean();
      if (!course) throw new Error('Course not found');

      const lessonSnapshots = flattenLessonTree(course.lessonTree);
      if (lessonSnapshots.length === 0)
        throw new Error('Course has no lessons');
      const lessonOccurrences = generateLessonOccurrences(
        lessonSnapshots,
        input.lesson_rate ?? 1
      );
      const scheduledDates = generateScheduledDates(
        startDate,
        input.weekdays ?? [],
        input.week_interval ?? 1,
        suspensionPeriods,
        lessonOccurrences.length,
        endDate
      );
      if (scheduledDates.length < lessonOccurrences.length)
        throw new Error(
          `Not enough scheduled days — ${scheduledDates.length} days available for ${lessonOccurrences.length} lessons`
        );

      const newEnrollment = await Enrollment.create({
        student: input.studentId,
        course: input.courseId,
        start_date: startDate,
        end_date: endDate,
        weekdays: input.weekdays,
        week_interval: input.week_interval,
        lesson_rate: input.lesson_rate,
        status: input.status,
        suspension_periods: suspensionPeriods,
        lesson_snapshot: lessonSnapshots,
        lesson_occurrences: lessonOccurrences,
        scheduled_dates: scheduledDates,
        last_synced_at: new Date(),
      });

      return newEnrollment.toObject();
    },
    updateEnrollment: async (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: {
          studentId?: string;
          courseId?: string;
          start_date?: string;
          end_date?: string | null;
          weekdays?: Array<number>;
          week_interval?: 1 | 2;
          lesson_rate?: 0.25 | 0.5 | 1 | 2;
          status?: 'active' | 'completed' | 'dropped';
          suspension_periods?: Array<{ start: string; end: string }>;
        };
      }
    ) => {
      if (input.weekdays !== undefined && input.weekdays.length === 0)
        throw new Error('At least one weekday must be selected');

      // 1. Fetch existing enrollment
      const existing = await Enrollment.findById(id);
      if (!existing) throw new Error('Enrollment not found');

      // 2. Convert incoming dates upfront
      const suspensionPeriods = input.suspension_periods?.map((p) => ({
        start: new Date(p.start),
        end: new Date(p.end),
      }));

      // 3. Detect what changed
      const lessonRateChanged =
        input.lesson_rate !== undefined &&
        input.lesson_rate !== existing.lesson_rate;
      const scheduleChanged =
        input.weekdays !== undefined ||
        input.week_interval !== undefined ||
        input.suspension_periods !== undefined ||
        input.start_date !== undefined ||
        'end_date' in input;

      // 4. Build basic updates
      const updates: Record<string, unknown> = {};
      if (input.studentId !== undefined) updates.student = input.studentId;
      if (input.courseId !== undefined) updates.course = input.courseId;
      if (input.start_date !== undefined)
        updates.start_date = new Date(input.start_date);
      if ('end_date' in input)
        updates.end_date = input.end_date ? new Date(input.end_date) : null;
      if (input.weekdays !== undefined) updates.weekdays = input.weekdays;
      if (input.week_interval !== undefined)
        updates.week_interval = input.week_interval;
      if (input.lesson_rate !== undefined)
        updates.lesson_rate = input.lesson_rate;
      if (input.status !== undefined) updates.status = input.status;
      if (suspensionPeriods !== undefined)
        updates.suspension_periods = suspensionPeriods;

      // 5. Regenerate lesson_occurrences if lesson_rate changed
      if (lessonRateChanged) {
        const completedLessons = existing.lesson_occurrences
          .flatMap((o) => o.lessons)
          .filter((l) => l.status === 'completed');
        const completedLessonIds = new Set(completedLessons.map((l) => l.lesson_id.toString()));

        const pendingLessons = existing.lesson_snapshot.filter(
          (l) => !completedLessonIds.has(l._id.toString())
        );

        const preservedOccurrences = completedLessons.map((l, i) => ({
          sequence: i + 1,
          lessons: [l]
        }));

        const newPendingOccurrences = generateLessonOccurrences(
          pendingLessons,
          input.lesson_rate!
        );
        const startSequence = preservedOccurrences.length + 1;
        newPendingOccurrences.forEach((o, i) => {
          o.sequence = startSequence + i;
        });

        updates.lesson_occurrences = [
          ...preservedOccurrences,
          ...newPendingOccurrences,
        ];
      }

      // 6. Regenerate scheduled_dates if any schedule field changed
      if (scheduleChanged) {
        const effectiveOccurrences = lessonRateChanged
          ? (updates.lesson_occurrences as typeof existing.lesson_occurrences)
          : existing.lesson_occurrences;

        const startDate = input.start_date
          ? new Date(input.start_date)
          : existing.start_date;
        const endDate =
          'end_date' in input
            ? input.end_date
              ? new Date(input.end_date)
              : undefined
            : (existing.end_date ?? undefined);
        const weekdays = input.weekdays ?? existing.weekdays;
        const weekInterval = input.week_interval ?? existing.week_interval;
        const effectiveSuspensions =
          suspensionPeriods ??
          existing.suspension_periods?.map((p) => ({
            start: p.start,
            end: p.end,
          })) ??
          [];

        const newScheduledDates = generateScheduledDates(
          startDate,
          weekdays,
          weekInterval,
          effectiveSuspensions,
          effectiveOccurrences.length,
          endDate
        );

        if (newScheduledDates.length < effectiveOccurrences.length)
          throw new Error(
            `Not enough scheduled days — ${newScheduledDates.length} days available for ${effectiveOccurrences.length} lessons`
          );

        updates.scheduled_dates = newScheduledDates;
      }

      const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        id,
        {
          $set: updates,
        },
        { returnDocument: 'after', runValidators: true }
      );
      if (!updatedEnrollment) throw new Error('Enrollment not found');
      return updatedEnrollment.toObject();
    },
    deleteEnrollment: async (_: unknown, { id }: { id: string }) => {
      const deletedEnrollment = await Enrollment.findByIdAndDelete(id);
      if (!deletedEnrollment) throw new Error('Enrollment not found');
      return true;
    },
  },
  Enrollment: {
    start_date: (parent: { start_date: Date | string | number }) =>
      new Date(parent.start_date).toISOString().slice(0, 10),
    end_date: (parent: { end_date?: Date | string | number | null }) =>
      parent.end_date
        ? new Date(parent.end_date).toISOString().slice(0, 10)
        : null,
    enrollment_date: (parent: { enrollment_date: Date | string | number }) =>
      new Date(parent.enrollment_date).toISOString().slice(0, 10),
    last_synced_at: (parent: { last_synced_at: Date | string | number }) =>
      new Date(parent.last_synced_at).toISOString().slice(0, 10),
    scheduled_dates: (parent: {
      scheduled_dates: Array<Date | string | number>;
    }) =>
      parent.scheduled_dates.map((d) => new Date(d).toISOString().slice(0, 10)),
  },
  SuspensionPeriod: {
    start: (parent: { start: Date | string | number }) =>
      new Date(parent.start).toISOString().slice(0, 10),
    end: (parent: { end: Date | string | number }) =>
      new Date(parent.end).toISOString().slice(0, 10),
  },
};
