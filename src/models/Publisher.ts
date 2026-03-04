import { Schema, model, Document } from 'mongoose';
import mongoose from 'mongoose';

export interface IPublisher extends Document {
  name: string;
}

const PublisherSchema = new Schema<IPublisher>({
  name: { type: String, required: true },
});

export default mongoose.models.Publisher
  ? (mongoose.models.Publisher as unknown as typeof model)
  : model<IPublisher>('Publisher', PublisherSchema);