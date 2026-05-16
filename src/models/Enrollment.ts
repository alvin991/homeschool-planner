import { Schema, model, Document, Types, Model } from 'mongoose';
import mongoose from 'mongoose';

export interface IEnrollment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollment_date: Date;
  frequency: Array<number>;
  lesson_rate: number;
  status: 'active' | 'completed' | 'dropped';
  suspension_periods?: Array<{ start: Date; end: Date }>;
}

const EnrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment_date: { type: Date, default: Date.now },
  frequency: { type: [Number], default: [] },
  lesson_rate: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
  suspension_periods: { type: [{ start: Date, end: Date }] },
});

const EnrollmentModel = (mongoose.models.Enrollment as Model<IEnrollment> | undefined) ??
  model<IEnrollment>('Enrollment', EnrollmentSchema);

export default EnrollmentModel;
