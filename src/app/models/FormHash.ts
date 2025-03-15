// models/FormHash.ts
import mongoose, { Document, Schema } from 'mongoose';

interface IMetadata {
  formId: string;
  responseId: string;
  timestamp: Date;
}

export interface IFormHash extends Document {
  hash: string;
  metadata: IMetadata;
  receivedAt: Date;
}

const FormHashSchema = new Schema<IFormHash>({
  hash: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    formId: String,
    responseId: String,
    timestamp: Date
  },
  receivedAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model is already defined to prevent overwriting
const FormHash = mongoose.models.FormHash || mongoose.model<IFormHash>('FormHash', FormHashSchema);

export default FormHash;