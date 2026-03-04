import { Schema, model, Document, Types } from 'mongoose';
import mongoose from 'mongoose';

export interface ILesson extends Document {
  title: string;
  content?: string;
  note?: string;
  order?: number;
}

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true },
  content: { type: String },
  note: { type: String },
  order: { type: Number },
});

export default mongoose.models.Lesson
  ? (mongoose.models.Lesson as unknown as typeof model)
  : model<ILesson>('Lesson', LessonSchema);