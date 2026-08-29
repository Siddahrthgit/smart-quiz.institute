import mongoose, { Schema, Document } from "mongoose";

export interface IMaterial extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  extractedText: string;
  fileUrl?: string;
  fileType?: string;
  createdAt: Date;
}

const MaterialSchema = new Schema<IMaterial>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  extractedText: { type: String, required: true },
  fileUrl: { type: String },
  fileType: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMaterial>("Material", MaterialSchema);
