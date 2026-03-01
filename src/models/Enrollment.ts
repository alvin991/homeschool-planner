import { Schema, model, Document, Types } from 'mongoose';
  
export interface IEnrollment extends Document {
  studentName: string; // Replace or extend with a User reference if needed
  course: Types.ObjectId;
  enrolledAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>({
  studentName: { type: String, required: true }, // Replace or extend with a User reference if needed
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
});

export default model<IEnrollment>('Enrollment', EnrollmentSchema);