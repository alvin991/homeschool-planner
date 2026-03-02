import { Schema, model, Document } from 'mongoose';

export interface IPublisher extends Document {
  name: string;
}

const PublisherSchema = new Schema<IPublisher>({
  name: { type: String, required: true },
});

export default model<IPublisher>('Publisher', PublisherSchema);