import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Enrollment from '@/models/Enrollment';
import EnrollmentBackup from '@/models/EnrollmentBackup';
import Course from '@/models/Course';
import {
  flattenLessonTree,
  generateLessonOccurrences,
  generateScheduledDates,
} from '@/app/api/graphql/lib/enrollmentUtils';

export async function GET() {
  await dbConnect();

  const results = {
    total: 0,
    backed_up: 0,
    migrated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const enrollments = await Enrollment.find({
    lesson_occurrences: { $exists: false },
  }).lean();

  results.total = enrollments.length;

  for (const enrollment of enrollments) {
    try {
      // check if backup exists
      let backup = await EnrollmentBackup.findOne({
        'original._id': enrollment._id,
      });

      if (!backup) {
        backup = await EnrollmentBackup.create({ original: enrollment });
        results.backed_up++;
      }

      const original = backup.original;

      // convert frequency → weekdays (subtract 1 from each value)
      const weekdays = (original.frequency ?? []).map((d: number) => d - 1);

      // fetch course
      const course = await Course.findById(original.course).lean();
      if (!course) {
        results.errors.push(
          `Course not found for enrollment ${enrollment._id}`
        );
        continue;
      }

      const lessonSnapshots = flattenLessonTree(course.lessonTree);
      if (lessonSnapshots.length === 0) {
        results.errors.push(
          `No lessons found for enrollment ${enrollment._id}`
        );
        continue;
      }

      const lessonOccurrences = generateLessonOccurrences(
        lessonSnapshots,
        original.lesson_rate ?? 1
      );

      const suspensionPeriods = (original.suspension_periods ?? []).map(
        (p: { start: Date; end: Date }) => ({ start: p.start, end: p.end })
      );

      const scheduledDates = generateScheduledDates(
        new Date(original.start_date),
        weekdays,
        1, // week_interval default
        suspensionPeriods,
        lessonOccurrences.length,
        original.end_date ? new Date(original.end_date) : undefined
      );

      await Enrollment.findByIdAndUpdate(enrollment._id, {
        $set: {
          weekdays,
          week_interval: 1,
          lesson_snapshot: lessonSnapshots,
          lesson_occurrences: lessonOccurrences,
          scheduled_dates: scheduledDates,
          last_synced_at: new Date(),
        },
        $unset: { frequency: '' },
      });

      results.migrated++;
    } catch (e) {
      results.errors.push(
        `Error migrating ${enrollment._id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return NextResponse.json(results);
}
