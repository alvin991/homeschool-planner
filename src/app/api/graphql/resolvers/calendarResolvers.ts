import Enrollment from '@/models/Enrollment';
import { ICourse } from '@/models/Course';
import { ISubject } from '@/models/Subject';
import Student from '@/models/Student';
import { rescheduleTailFrom, canRescheduleRemaining, pendingLessonsForDate } from '../lib/enrollmentUtils';
import { DEFAULT_LESSON_CUTOFF_TIME } from '@/utils/constants';
import { familyNow } from '@/utils/dateUtils';

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
      await processOverdueLessons(studentId, student?.lesson_cutoff_time);

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
        lesson_id: unknown;
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
        const pendingToday = pendingLessonsForDate(enrollment, date);

        // any lesson completed today, regardless of which day it was originally scheduled for
        const completedToday = enrollment.lesson_occurrences
          .flatMap((o) =>
            o.lessons.map((l) => ({ lesson: l, sequence: o.sequence }))
          )
          .filter(
            ({ lesson: l }) =>
              l.status === 'completed' &&
              l.completed_date &&
              new Date(l.completed_date).toISOString().slice(0, 10) === date
          );

        const toShow = [...pendingToday, ...completedToday];
        if (toShow.length === 0) continue;

        const course = enrollment.course as unknown as IPopulatedCourse;
        for (const { lesson: l, sequence } of toShow) {
          const snapshot = enrollment.lesson_snapshot.find(
            (s) => s._id.toString() === l.lesson_id.toString()
          );
          dayLessons.push({
            enrollment_id: enrollment._id,
            lesson_id: l.lesson_id,
            sequence,
            course_title: course.title,
            course_abbr: course.abbr,
            subject_color: course.subject.color,
            lesson_title: l.lesson_title,
            content: snapshot?.content ?? '',
            note: snapshot?.note ?? '',
            day_number: l.day_number,
            total_days: l.total_days,
            status: l.status,
          });
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
      await processOverdueLessons(studentId, student?.lesson_cutoff_time);

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
          lesson_id: unknown;
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
          can_reschedule_remaining: boolean;
        }[]
      >();

      for (const enrollment of enrollments) {
        const course = enrollment.course as unknown as IPopulatedCourse;

        for (let i = 0; i < enrollment.scheduled_dates.length; i++) {
          const occurrence = enrollment.lesson_occurrences.find(
            (o) => o.sequence === i + 1
          );
          if (!occurrence) continue;

          const schedDate = new Date(enrollment.scheduled_dates[i])
            .toISOString()
            .slice(0, 10);

          for (const l of occurrence.lessons) {
            // completed lessons show on the day they were actually finished,
            // not the occurrence's (possibly since-rescheduled) planned date
            const placementDate =
              l.status === 'completed' && l.completed_date
                ? new Date(l.completed_date).toISOString().slice(0, 10)
                : schedDate;

            if (placementDate < startDate || placementDate > endDate) continue;

            if (!dayMap.has(placementDate)) dayMap.set(placementDate, []);
            const dayLessons = dayMap.get(placementDate)!;

            const snapshot = enrollment.lesson_snapshot.find(
              (s) => s._id.toString() === l.lesson_id.toString()
            );
            dayLessons.push({
              enrollment_id: enrollment._id,
              lesson_id: l.lesson_id,
              sequence: occurrence.sequence,
              course_title: course.title,
              course_abbr: course.abbr,
              subject_color: course.subject.color,
              lesson_title: l.lesson_title,
              content: snapshot?.content ?? '',
              note: snapshot?.note ?? '',
              day_number: l.day_number,
              total_days: l.total_days,
              status: l.status,
              can_reschedule_remaining: l.status === 'pending' ? canRescheduleRemaining(enrollment, occurrence.sequence, l.lesson_id.toString()) : false,
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
  cutoffTime: string = DEFAULT_LESSON_CUTOFF_TIME // e.g. "20:00"
): Promise<void> {
  // 1. Parse cutoff into today's datetime
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const nowFamilyTz = familyNow();
  const todayISO = nowFamilyTz.toISODate()!; // e.g. "2026-06-15"
  const cutoffFamilyTz = nowFamilyTz.set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });
  const pastCutoff = nowFamilyTz > cutoffFamilyTz;

  // 2. Fetch active enrollments for student
  const enrollments = await Enrollment.find({
    student: studentId,
    status: { $in: ['active'] },
  })
    .populate('course')
    .lean();

  // 3. For each enrollment:
  for (const enrollment of enrollments) {
    const firstOverdueIndex = enrollment.scheduled_dates.findIndex(
      (date, i) => {
        const schedDateISO = new Date(date).toISOString().slice(0, 10);
        const isOverdue =
          schedDateISO < todayISO || // past day → always reschedule
          (schedDateISO === todayISO && pastCutoff); // today → only after cutoff

        const occurrence = enrollment.lesson_occurrences.find(
          (o) => o.sequence === i + 1
        );
        return (
          occurrence?.lessons.some((l) => l.status === 'pending') && isOverdue
        );
      }
    );

    //    b. If none → continue
    if (firstOverdueIndex === -1) continue; // no overdue lessons, skip this enrollment

    //    c. reschedule the tail + save
    // Today itself is still a valid slot for the fresh tail as long as we're
    // not past cutoff yet — nothing has happened today, unlike the backdate-
    // completion call site where "today" is already spoken for by the lesson
    // that was just completed.
    const updatedDates = rescheduleTailFrom(enrollment, firstOverdueIndex, nowFamilyTz, !pastCutoff);
    const course = enrollment.course as unknown as ICourse;
    console.log(
      `[reschedule] enrollment ${enrollment._id} ${course.title}: ${enrollment.scheduled_dates.length - firstOverdueIndex} lessons rescheduled`
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
