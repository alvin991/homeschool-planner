import { Schema, model, Document, Types, Model } from 'mongoose';
import mongoose from 'mongoose';

export interface ILessonSnapshot {
  _id: Types.ObjectId;
  title: string;
  content: string;
  note: string;
}

export interface ILessonOccurrenceLesson {
  lesson_id: Types.ObjectId;  // ref into lesson_snapshot
  lesson_title: string;       // denormalized for display
  day_number?: number;        // only when lesson_rate < 1
  total_days?: number;        // only when lesson_rate < 1
  status: 'pending' | 'completed' | 'skipped';
  completed_date?: Date;
}

export interface ILessonOccurrence {
  sequence: number;                    // 1-based, matches index in scheduled_dates
  lessons: ILessonOccurrenceLesson[];  // one or more lessons for that day
}

export interface IEnrollment<TCourse = Types.ObjectId> extends Document {
  student: Types.ObjectId;
  course: TCourse;
  enrollment_date: Date;
  start_date: Date;
  end_date?: Date;
  weekdays: Array<number>;
  week_interval: 1 | 2;
  lesson_rate: 0.25 | 0.5 | 1 | 2;
  status: 'active' | 'completed' | 'dropped';
  suspension_periods?: Array<{ start: Date; end: Date }>;
  lesson_snapshot: Array<ILessonSnapshot>;
  lesson_occurrences: Array<ILessonOccurrence>;
  scheduled_dates: Array<Date>;
  last_synced_at: Date;
}

const LessonSnapshotSchema = new Schema<ILessonSnapshot>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }  // don't auto-generate a new _id, we supply it
);

const LessonOccurrenceLessonSchema = new Schema(
  {
    lesson_id: { type: Schema.Types.ObjectId, required: true },
    lesson_title: { type: String, required: true },
    day_number: { type: Number },
    total_days: { type: Number },
    status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
    completed_date: { type: Date },
  },
  { _id: false }
);

const LessonOccurrenceSchema = new Schema(
  {
    sequence: { type: Number, required: true },
    lessons: { type: [LessonOccurrenceLessonSchema], default: [] },
  },
  { _id: false }
);

const EnrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment_date: { type: Date, default: Date.now },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  weekdays: { type: [Number], default: [] },
  week_interval: { type: Number, enum: [1, 2], default: 1 },
  lesson_rate: { type: Number, enum: [0.25, 0.5, 1, 2], default: 1 },
  status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
  suspension_periods: { type: [{ start: Date, end: Date }] },
  lesson_snapshot: { type: [LessonSnapshotSchema], default: [] },
  lesson_occurrences: { type: [LessonOccurrenceSchema], default: [] },
  scheduled_dates: { type: [Date], default: [] },
  last_synced_at: { type: Date, default: Date.now }
});

const EnrollmentModel = (mongoose.models.Enrollment as Model<IEnrollment> | undefined) ??
  model<IEnrollment>('Enrollment', EnrollmentSchema);

export default EnrollmentModel;
