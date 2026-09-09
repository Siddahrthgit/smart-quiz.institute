import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  gateway: 'esewa' | 'khalti';
  transactionUuid: string;
  gatewayRefId?: string;
  amount: number;
  plan: 'monthly' | 'annual';
  status: 'pending' | 'success' | 'failed';
  rawResponse?: any;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gateway: { type: String, enum: ['esewa', 'khalti'], required: true },
    transactionUuid: { type: String, required: true, unique: true },
    gatewayRefId: { type: String },
    amount: { type: Number, required: true },
    plan: { type: String, enum: ['monthly', 'annual'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    rawResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
