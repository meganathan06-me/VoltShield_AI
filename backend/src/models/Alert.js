import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  bayId: { type: String, required: true, index: true },
  status: { type: String, enum: ['WARNING', 'CRITICAL'], required: true },
  message: { type: String, required: true },
  temperatureC: Number,
  currentA: Number,
  acknowledged: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Alert', alertSchema);
