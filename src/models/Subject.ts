import { Schema, model, Document } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  color: string;
}

const SubjectSchema = new Schema<ISubject>({
  name: { type: String, required: true },
  color: { type: String, required: true },
});

export default model<ISubject>('Subject', SubjectSchema);