import Enrollment from '@/models/Enrollment';
import { ICourse } from '@/models/Course';
import { ISubject } from '@/models/Subject';
import Student from '@/models/Student';
import { generateScheduledDates } from '../lib/enrollmentUtils';
import { DEFAULT_LESSON_CUTOFF_TIME } from '@/utils/constants';

type IPopulatedCourse = Omit<ICourse, 'subject'> & { subject: ISubject };

export const calendarResolvers = {
  Query: {
    calendarDayView: async (
      _: unknown,
      { studentId, date }: { studentId: string; date: string }
    ) => {
      const student = await Student.findById(studentId).lean();
      const studentName = student?.name ?? '';

      // ← add here, before the enrollment fetch
      await processOverdueLessons(studentId, student?.lesson_cutoff_time ?? DEFAULT_LESSON_CUTOFF_TIME);

      const enrollments = await Enrollment.find({
        student: studentId,
        status: { $in: ['active'] }, // excludes dropped and completed
        start_date: { $lte: date },
        $or: [
          { end_date: { $gte: date } },
          { end_date: null },
          { end_date: { $exists: false } },
        ],
      })
        .populate({ path: 'course', populate: { path: 'subject' } })
        .lean();

      const dayLessons: {
        enrollment_id: unknown;
        sequence: number;
        course_title: string;
        course_abbr: string;
        subject_color: string;
        lesson_title: string;
        content: string;
        note: string;
        day_number?: number;
        total_days?: number;
        status: string;
      }[] = [];

      for (const enrollment of enrollments) {
        const isScheduledDay = enrollment.scheduled_dates.some(
          (d) => new Date(d).toISOString().slice(0, 10) === date
        );
        if (!isScheduledDay) continue;

        const firstPending = enrollment.lesson_occurrences.find(
          (o) =>
            o.status === 'pending' &&
            enrollment.scheduled_dates[o.sequence - 1] !== undefined &&
            new Date(enrollment.scheduled_dates[o.sequence - 1])
              .toISOString()
              .slice(0, 10) === date
        );
        const completedToday = enrollment.lesson_occurrences.filter(
          (o) =>
            o.status === 'completed' &&
            o.completed_date &&
            new Date(o.completed_date).toISOString().slice(0, 10) === date
        );

        const occurrences = [
          ...(firstPending ? [firstPending] : []),
          ...completedToday,
        ];

        if (occurrences.length === 0) continue;

        const course = enrollment.course as unknown as IPopulatedCourse;

        for (const occurrence of occurrences) {
          for (const l of occurrence.lessons) {
            const snapshot = enrollment.lesson_snapshot.find(
              (s) => s._id.toString() === l.lesson_id.toString()
            );
            dayLessons.push({
              enrollment_id: enrollment._id,
              sequence: occurrence.sequence,
              course_title: course.title,
              course_abbr: course.abbr,
              subject_color: course.subject.color,
              lesson_title: l.lesson_title,
              content: snapshot?.content ?? '',
              note: snapshot?.note ?? '',
              day_number: l.day_number,
              total_days: l.total_days,
              status: occurrence.status,
            });
          }
        }
      }

      dayLessons.sort((a, b) => {
        if (a.status === b.status)
          return a.course_title.localeCompare(b.course_title);
        return a.status === 'completed' ? 1 : -1;
      });

      return { date, studentName, lessons: dayLessons };
    },
    calendarMonthView: async (
      _: unknown,
      { studentId, month }: { studentId: string; month: string }
    ) => {
      // 1. Parse month ("2026-06") into startDate / endDate strings
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = `${month}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      // 2. Fetch student name
      const student = await Student.findById(studentId).lean();
      const studentName = student?.name ?? '';

      // ← call here, BEFORE the view's enrollment fetch
      await processOverdueLessons(studentId, student?.lesson_cutoff_time ?? DEFAULT_LESSON_CUTOFF_TIME);

      // 3. Query enrollments that overlap this month (same filter as calendarDayView, but date range)
      const enrollments = await Enrollment.find({
        student: studentId,
        status: { $in: ['active'] },
        start_date: { $lte: endDate },
        $or: [
          { end_date: { $gte: startDate } },
          { end_date: null },
          { end_date: { $exists: false } },
        ],
      })
        .populate({ path: 'course', populate: { path: 'subject' } })
        .lean();

      // 4. Build a Map<date-string, lessons[]>
      const dayMap = new Map<
        string,
        {
          enrollment_id: unknown;
          sequence: number;
          course_title: string;
          course_abbr: string;
          subject_color: string;
          lesson_title: string;
          content: string;
          note: string;
          day_number?: number;
          total_days?: number;
          status: string;
        }[]
      >();

      for (const enrollment of enrollments) {
        const course = enrollment.course as unknown as IPopulatedCourse;

        // Iterate scheduled_dates (0-indexed); sequence is 1-based
        for (let i = 0; i < enrollment.scheduled_dates.length; i++) {
          const schedDate = new Date(enrollment.scheduled_dates[i])
            .toISOString()
            .slice(0, 10);
          if (schedDate < startDate || schedDate > endDate) continue;

          const occurrence = enrollment.lesson_occurrences.find(
            (o) => o.sequence === i + 1
          );
          if (!occurrence) continue;

          if (!dayMap.has(schedDate)) dayMap.set(schedDate, []);
          const dayLessons = dayMap.get(schedDate)!;

          for (const l of occurrence.lessons) {
            const snapshot = enrollment.lesson_snapshot.find(
              (s) => s._id.toString() === l.lesson_id.toString()
            );
            dayLessons.push({
              enrollment_id: enrollment._id,
              sequence: occurrence.sequence,
              course_title: course.title,
              course_abbr: course.abbr,
              subject_color: course.subject.color,
              lesson_title: l.lesson_title,
              content: snapshot?.content ?? '',
              note: snapshot?.note ?? '',
              day_number: l.day_number,
              total_days: l.total_days,
              status: occurrence.status,
            });
          }
        }
      }

      // 5. Convert Map to sorted days array (sort lessons within each day too)
      const days = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lessons]) => {
          lessons.sort((a, b) => {
            if (a.status === b.status)
              return a.course_title.localeCompare(b.course_title);
            return a.status === 'completed' ? 1 : -1;
          });
          return { date, studentName, lessons };
        });

      return { month, days };
    },
  },
};

async function processOverdueLessons(
  studentId: string,
  cutoffTime: string // e.g. "20:00"
): Promise<void> {
  // 1. Parse cutoff into today's datetime
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const now = new Date();
  const todayCutoffTime = new Date(now);
  todayCutoffTime.setHours(hours, minutes, 0, 0);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // 2. Fetch active enrollments for student
  const enrollments = await Enrollment.find({
    student: studentId,
    status: { $in: ['active'] },
  })
    .populate('course')
    .lean();

  // 3. For each enrollment:
  for (const enrollment of enrollments) {
    const firstOverdueIndex = enrollment.scheduled_dates.findIndex((date, i) => {
      const schedDate = new Date(date);
      const isOverdue =
        schedDate < startOfToday || // past day → always reschedule
        (schedDate.toDateString() === now.toDateString() &&
          now > todayCutoffTime); // today → only after cutoff

      const occurrence = enrollment.lesson_occurrences.find(
        (o) => o.sequence === i + 1
      ); 

      return occurrence?.status === 'pending' && isOverdue;
    });

    //    b. If none → continue
    if (firstOverdueIndex === -1) continue; // no overdue lessons, skip this enrollment

    //    c. splice + regenerate + save
    const lessonsNeedReschedule =
      enrollment.scheduled_dates.splice(firstOverdueIndex);

    // generate same count of new dates following the enrollment's pattern
    const newDates = generateScheduledDates(
      startOfToday,
      enrollment.weekdays,
      enrollment.week_interval ?? 1,
      (enrollment.suspension_periods ?? []).map((p) => ({
        start: new Date(p.start),
        end: new Date(p.end),
      })),
      lessonsNeedReschedule.length,
      enrollment.end_date ? new Date(enrollment.end_date) : undefined
    );

    // append new dates and save
    const updatedDates = [...enrollment.scheduled_dates, ...newDates];
    const course = enrollment.course as unknown as ICourse;
    console.log(
      `[reschedule] enrollment ${enrollment._id} ${course.title}: ${lessonsNeedReschedule.length} lessons rescheduled`
    );
    console.log(
      `[reschedule] new scheduled_dates:`,
      updatedDates.map((d) => new Date(d).toISOString().slice(0, 10))
    );

    await Enrollment.findByIdAndUpdate(enrollment._id, {
      scheduled_dates: updatedDates,
    });
  }
}
