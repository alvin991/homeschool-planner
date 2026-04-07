/**
 * If courses still have a flat embedded `lessons` array (legacy), convert to `lessonTree`
 * as a single-level list of `{ kind: 'lesson', ... }` nodes, then `$unset` `lessons`.
 *
 * Run: `npx tsx scripts/migrate-flat-lessons-to-lessonTree.ts`
 */
import mongoose from 'mongoose';

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://homeschool_user:homeschool_password@db:27017/homeschool_planner?authSource=admin';
  await mongoose.connect(uri);

  const db = mongoose.connection.db!;
  const col = db.collection('courses');

  const docs = await col
    .find({
      lessons: { $exists: true, $ne: [] as unknown },
      lessonTree: { $exists: false },
    })
    .toArray();

  for (const doc of docs) {
    const lessons = doc.lessons as Array<{
      _id?: mongoose.Types.ObjectId;
      title: string;
      order?: number;
      content?: string;
      note?: string;
    }> | null;
    if (!lessons?.length) continue;

    const lessonTree = lessons.map((l, i) => ({
      kind: 'lesson' as const,
      title: l.title,
      order: l.order ?? i,
      content: l.content,
      note: l.note,
      ...(l._id ? { _id: l._id } : {}),
    }));

    await col.updateOne(
      { _id: doc._id },
      { $set: { lessonTree }, $unset: { lessons: '' } },
    );
  }

  await col.updateMany(
    { lessonTree: { $exists: false } },
    { $set: { lessonTree: [] } },
  );

  console.log(`Migrated ${docs.length} course(s) from flat lessons to lessonTree.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
