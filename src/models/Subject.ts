import { Schema, model, Document, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface ISubject extends Document {
  name: string;
  color: string;
}

const SubjectSchema = new Schema<ISubject>({
  name: { type: String, required: true },
  color: { type: String, required: true },
});

const SubjectModel =
  (mongoose.models.Subject as Model<ISubject> | undefined) ??
  model<ISubject>('Subject', SubjectSchema);

export default SubjectModel;