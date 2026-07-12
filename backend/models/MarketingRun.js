import mongoose from 'mongoose';

const marketingRunSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, index: true },
    runType: { type: String, enum: ['weekly', 'ai-blast'], default: 'weekly' },
    subject: String,
    theme: String,
    generatedContent: { type: mongoose.Schema.Types.Mixed },
    aiSource: String,
    aiModel: String,
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    status: { type: String, enum: ['running', 'completed', 'failed'], default: 'completed' },
    errorMessage: String,
    completedAt: Date,
    triggeredBy: { type: String, enum: ['cron', 'admin', 'manual'], default: 'cron' },
  },
  { timestamps: true }
);

marketingRunSchema.index({ weekKey: 1, runType: 1 }, { unique: true });

export default mongoose.model('MarketingRun', marketingRunSchema);
