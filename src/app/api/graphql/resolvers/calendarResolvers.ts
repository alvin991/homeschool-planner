import Enrollment from '@/models/Enrollment';
import { ICourse } from '@/models/Course';
import { ISubject } from '@/models/Subject';

type IPopulatedCourse = Omit<ICourse, 'subject'> & { subject: ISubject };

export const calendarResolvers = {
  Query: {
    calendarDayView: async (
      _: unknown,
      { studentId, date }: { studentId: string; date: string }
    ) => {
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
        const index = enrollment.scheduled_dates.findIndex(
          (d) => new Date(d).toISOString().slice(0, 10) === date
        );
        if (index === -1) continue;

        const occurrence = enrollment.lesson_occurrences[index];
        const course = enrollment.course as unknown as IPopulatedCourse;

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

      dayLessons.sort((a, b) => a.course_title.localeCompare(b.course_title));

      return { date, lessons: dayLessons };
    },
    calendarMonthView: async (
      _: unknown,
      { studentId, month }: { studentId: string; month: string }
    ) => {
      return { month, days: [] }; // placeholder until we implement this in the data source
    },
  },
};
