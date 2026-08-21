import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  resetPasswordToken?: string;
  subscription: {
    status: 'free' | 'premium';
    plan?: 'monthly' | 'annual';
    expiresAt?: Date;
  };
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    subscription: {
      status: { type: String, enum: ['free', 'premium'], default: 'free' },
      plan: { type: String, enum: ['monthly', 'annual'] },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
