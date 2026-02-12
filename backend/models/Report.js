import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    reportedStory: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'nudity',
        'false_info',
        'other',
      ],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
