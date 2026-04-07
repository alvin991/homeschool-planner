import { Schema, model, Document, Types, type Model } from 'mongoose';
import mongoose from 'mongoose';

export type CourseLessonNodeKind = 'lesson' | 'folder';

export interface ICourseLessonNode {
  _id: Types.ObjectId;
  kind: CourseLessonNodeKind;
  order: number;
  title?: string;
  content?: string;
  note?: string;
  children?: ICourseLessonNode[];
}

const CourseLessonNodeSchema = new Schema(
  {
    kind: { type: String, enum: ['lesson', 'folder'], required: true },
    order: { type: Number, default: 0 },
    title: { type: String },
    content: { type: String },
    note: { type: String },
  },
  { _id: true },
);

CourseLessonNodeSchema.pre('validate', function () {
  const doc = this as mongoose.Document & { kind?: string; title?: string };
  if (doc.kind === 'folder') {
    if (!doc.title || !String(doc.title).trim()) {
      throw new Error('Folder node requires a non-empty title');
    }
  } else if (doc.kind === 'lesson') {
    if (!doc.title || !String(doc.title).trim()) {
      throw new Error('Lesson node requires a non-empty title');
    }
  }
});

CourseLessonNodeSchema.add({
  children: [CourseLessonNodeSchema],
});

export interface ICourse extends Document {
  title: string;
  grade: string;
  note?: string;
  lessonTree: ICourseLessonNode[];
  subject: Types.ObjectId;
  publisher: Types.ObjectId;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  grade: { type: String, required: true },
  note: { type: String },
  lessonTree: { type: [CourseLessonNodeSchema], default: [] },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  publisher: { type: Schema.Types.ObjectId, ref: 'Publisher', required: true },
});

const CourseModel =
  (mongoose.models.Course as Model<ICourse> | undefined) ??
  model<ICourse>('Course', CourseSchema);

export default CourseModel;
