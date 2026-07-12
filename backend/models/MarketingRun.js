import mongoose from 'mongoose';

const marketingRunSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, unique: true, index: true },
    subject: String,
    theme: String,
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    completedAt: Date,
    triggeredBy: { type: String, enum: ['cron', 'admin', 'manual'], default: 'cron' },
  },
  { timestamps: true }
);

export default mongoose.model('MarketingRun', marketingRunSchema);
