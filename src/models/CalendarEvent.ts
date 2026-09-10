import { Schema, model, Document, Types, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface ICalendarEvent extends Document {
  title: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD", === start_date for a single day
  student?: Types.ObjectId | null; // null = global/family-wide
}

const CalendarEventSchema = new Schema<ICalendarEvent>({
  title: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  student: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
});

const CalendarEventModel =
  (mongoose.models.CalendarEvent as Model<ICalendarEvent> | undefined) ??
  model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

export default CalendarEventModel;
