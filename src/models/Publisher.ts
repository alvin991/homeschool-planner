import { Schema, model, Document, type Model } from 'mongoose';
import mongoose from 'mongoose';

export interface IPublisher extends Document {
  name: string;
}

const PublisherSchema = new Schema<IPublisher>({
  name: { type: String, required: true },
});

const PublisherModel =
  (mongoose.models.Publisher as Model<IPublisher> | undefined) ??
  model<IPublisher>('Publisher', PublisherSchema);

export default PublisherModel;