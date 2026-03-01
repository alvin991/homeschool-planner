import { Schema, model, Document, Types } from 'mongoose';

export interface ICourse extends Document {
  publisher: string;
  title: string;
  frGrade: string;
  toGrade: string;
  note?: string;
  lessons: Types.ObjectId[];
}

const CourseSchema = new Schema<ICourse>({
  publisher: { type: String, required: true },
  title: { type: String, required: true },
  frGrade: { type: String, required: true },
  toGrade: { type: String, required: true },
  note: { type: String },
  lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
});

export default model<ICourse>('Course', CourseSchema);