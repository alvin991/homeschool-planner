import { Schema, model, Document, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface IStudent extends Document {
  name: string;
}

const StudentSchema = new Schema<IStudent>({
  name: { type: String, required: true },
});

const StudentModel =
  (mongoose.models.Student as Model<IStudent> | undefined) ??
  model<IStudent>('Student', StudentSchema);

export default StudentModel;