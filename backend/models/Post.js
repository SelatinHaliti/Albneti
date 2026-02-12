import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['image', 'video', 'reel'],
      default: 'image',
    },
    media: [
      {
        url: { type: String, required: true },
        publicId: String,
        type: { type: String, enum: ['image', 'video'] },
      },
    ],
    caption: {
      type: String,
      maxlength: [2200, 'Caption nuk mund të kalojë 2200 karaktere'],
      default: '',
    },
    hashtags: [{ type: String, trim: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    music: {
      url: String,
      publicId: String,
      title: String,
      artist: String,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);
