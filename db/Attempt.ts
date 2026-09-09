import mongoose, { Schema, Document } from 'mongoose';

export interface IAttemptQuestion {
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  isCorrect: boolean;
  topic?: string;
  note?: string; // AI-generated notes-form explanation, filled in for wrong answers on Page 3
}

export interface IAttempt extends Document {
  ownerId: string; // either a User _id (as string) or a Guest guestId
  ownerType: 'user' | 'guest';
  docId: string;
  branch: string;
  subject: string;
  questions: IAttemptQuestion[];
  score: number;
  total: number;
  source: 'exam' | 'reattempt';
  parentAttemptId?: string; // set when this is a reattempt of wrong questions from an earlier attempt
  createdAt: Date;
}

const attemptQuestionSchema = new Schema<IAttemptQuestion>(
  {
    question: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    userAnswer: { type: String },
    isCorrect: { type: Boolean, required: true },
    topic: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const attemptSchema = new Schema<IAttempt>(
  {
    ownerId: { type: String, required: true, index: true },
    ownerType: { type: String, enum: ['user', 'guest'], required: true },
    docId: { type: String, required: true },
    branch: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    questions: [attemptQuestionSchema],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    source: { type: String, enum: ['exam', 'reattempt'], default: 'exam' },
    parentAttemptId: { type: String },
  },
  { timestamps: true }
);

export const Attempt = mongoose.models.Attempt || mongoose.model<IAttempt>('Attempt', attemptSchema);
