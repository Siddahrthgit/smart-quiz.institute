import mongoose, { Schema, Document } from "mongoose";

export interface IMaterial extends Document {
  docId: string;
  userId?: mongoose.Types.ObjectId;
  title: string;
  extractedText: string;
  fileUrl?: string;
  fileType?: string;
  sizeFormatted?: string;
  wordCount?: number;
  summary?: string;
  createdAt: Date;
}

const MaterialSchema = new Schema<IMaterial>({
  docId: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  title: { type: String, required: true },
  extractedText: { type: String, required: true },
  fileUrl: { type: String },
  fileType: { type: String },
  sizeFormatted: { type: String },
  wordCount: { type: Number },
  summary: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMaterial>("Material", MaterialSchema);
