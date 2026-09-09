import mongoose from 'mongoose';

let connected = false;

export async function connectDB() {
  if (connected) return;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('MONGO_URI is not set — auth/database routes will fail until it is configured.');
    return;
  }
  try {
    await mongoose.connect(uri);
    connected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}
