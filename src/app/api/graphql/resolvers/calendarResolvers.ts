import Enrollment from '@/models/Enrollment';
import { ICourse } from '@/models/Course';
import { ISubject } from '@/models/Subject';
import Student from '@/models/Student';

type IPopulatedCourse = Omit<ICourse, 'subject'> & { subject: ISubject };

export const calendarResolvers = {
  Query: {
    calendarDayView: async (
      _: unknown,
      { studentId, date }: { studentId: string; date: string }
    ) => {
      const student = await Student.findById(studentId).lean();
      const studentName = student?.name ?? '';

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
        if (a.status === b.status) return a.course_title.localeCompare(b.course_title);
        return a.status === 'completed' ? 1 : -1;
      });

      return { date, studentName, lessons: dayLessons };
    },
    calendarMonthView: async (
      _: unknown,
      { studentId, month }: { studentId: string; month: string }
    ) => {
      return { month, days: [] }; // placeholder until we implement this in the data source
    },
  },
};
