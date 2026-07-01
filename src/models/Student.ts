import { Schema, model, Document, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface IStudent extends Document {
  name: string;
  lesson_cutoff_time: string
}

const StudentSchema = new Schema<IStudent>({
  name: { type: String, required: true },
  lesson_cutoff_time: { type: String, default: '20:00'}
});

const StudentModel =
  (mongoose.models.Student as Model<IStudent> | undefined) ??
  model<IStudent>('Student', StudentSchema);

export default StudentModel;