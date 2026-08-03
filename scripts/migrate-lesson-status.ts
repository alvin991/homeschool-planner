/**
 * Backfill status/completed_date onto each lesson in lesson_occurrences[].lessons,
 * for enrollments still on the old occurrence-level status shape.
 *
 * Run from repo root (loads .env via dotenv):
 *   npx tsx scripts/migrate-lesson-status.ts
 *
 * Add --dry-run to log what would change without writing anything:
 *   npx tsx scripts/migrate-lesson-status.ts --dry-run
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Enrollment from '../src/models/Enrollment';
import EnrollmentBackup from '../src/models/EnrollmentBackup';

interface LegacyLesson {
  lesson_id: mongoose.Types.ObjectId;
  lesson_title: string;
  day_number?: number;
  total_days?: number;
  status?: 'pending' | 'completed' | 'skipped';
  completed_date?: Date;
}

interface LegacyOccurrence {
  sequence: number;
  lessons: LegacyLesson[];
  status?: 'pending' | 'completed' | 'skipped';
  completed_date?: Date;
}

interface LegacyEnrollment {
  _id: mongoose.Types.ObjectId;
  lesson_occurrences: LegacyOccurrence[];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'Missing MONGODB_URI. Set it in .env at the repo root (same as Next.js).',
    );
  }
  await mongoose.connect(uri);
  console.log(
    `Connected to: ${mongoose.connection.name} (${mongoose.connection.host})${dryRun ? ' [DRY RUN]' : ''}`,
  );

  const enrollments = (await Enrollment.find({
    'lesson_occurrences.lessons.status': { $exists: false },
  }).lean()) as unknown as LegacyEnrollment[];

  let migrated = 0;
  for (const enrollment of enrollments) {
    const existingBackup = await EnrollmentBackup.findOne({
      'original._id': enrollment._id,
    });
    if (!existingBackup) {
      if (dryRun) {
        console.log(`[dry-run] would back up enrollment ${enrollment._id}`);
      } else {
        await EnrollmentBackup.create({ original: enrollment });
      }
    }

    const migratedOccurrences = enrollment.lesson_occurrences.map((occ) => ({
      sequence: occ.sequence,
      lessons: occ.lessons.map((l) => ({
        lesson_id: l.lesson_id,
        lesson_title: l.lesson_title,
        day_number: l.day_number,
        total_days: l.total_days,
        status: l.status ?? occ.status ?? 'pending',
        completed_date: l.completed_date ?? occ.completed_date,
      })),
    }));

    if (dryRun) {
      console.log(
        `[dry-run] would migrate enrollment ${enrollment._id} (${migratedOccurrences.length} occurrence(s))`,
      );
    } else {
      await Enrollment.updateOne(
        { _id: enrollment._id },
        { $set: { lesson_occurrences: migratedOccurrences } },
      );
    }
    migrated++;
  }

  console.log(
    `${dryRun ? '[dry-run] Would migrate' : 'Migrated'} ${migrated} of ${enrollments.length} enrollment(s).`,
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
