import { Schema, model, Document, Types, type Model } from 'mongoose';
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

const LessonModel =
  (mongoose.models.Lesson as Model<ILesson> | undefined) ??
  model<ILesson>('Lesson', LessonSchema);

export default LessonModel;