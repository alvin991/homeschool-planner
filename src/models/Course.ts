import { Schema, model, Document, Types } from 'mongoose';
import mongoose from 'mongoose';

export interface ICourse extends Document {
  title: string;
  grade: string;
  note?: string;
  lessons: Types.ObjectId[];
  subject: Types.ObjectId;
  publisher: Types.ObjectId;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  grade: { type: String, required: true },
  note: { type: String },
  lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  publisher: { type: Schema.Types.ObjectId, ref: 'Publisher', required: true },
});

export default mongoose.models.Course
  ? (mongoose.models.Course as unknown as typeof model)
  : model<ICourse>('Course', CourseSchema);