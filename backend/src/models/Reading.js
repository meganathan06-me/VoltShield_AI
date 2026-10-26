import mongoose from 'mongoose';

const readingSchema = new mongoose.Schema({
  bayId: { type: String, required: true, trim: true, index: true },
  temperatureC: { type: Number, required: true },
  currentA: { type: Number, required: true },
  deviceOnline: { type: Boolean, default: true },
  source: { type: String, enum: ['esp32', 'simulator', 'manual'], default: 'manual' },
  status: { type: String, enum: ['NORMAL', 'WARNING', 'CRITICAL'], required: true },
  reasons: [{ type: String }],
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  recordedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

readingSchema.index({ bayId: 1, recordedAt: -1 });
export default mongoose.model('Reading', readingSchema);
