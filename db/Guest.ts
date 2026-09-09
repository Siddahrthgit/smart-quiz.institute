import mongoose, { Schema, Document, Model } from 'mongoose';

// A guest is an anonymous student identified only by a client-generated
// guestId (stored in their browser). They get the same isolation and the
// same "branch fixed once set" rule as a real logged-in User, without
// having to sign up. If they later register, their guestId's data is
// reassigned to the new userId (see /api/guest/merge).
export interface IGuest extends Document {
  guestId: string;
  branch?: string;
  mergedIntoUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  lastActiveAt?: Date;
}

const guestSchema = new Schema<IGuest>(
  {
    guestId: { type: String, required: true, unique: true, index: true },
    branch: { type: String },
    mergedIntoUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

export const Guest: Model<IGuest> = mongoose.models.Guest || mongoose.model<IGuest>('Guest', guestSchema);
