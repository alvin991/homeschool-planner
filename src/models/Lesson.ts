import { Schema, model, Document, Types } from 'mongoose';

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

export default model<ILesson>('Lesson', LessonSchema);