import mongoose from 'mongoose';

const interestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    reminder24hSent: { type: Boolean, default: false },
    reminder1hSent: { type: Boolean, default: false },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    shortDate: { type: String, required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date },
    location: { type: String, required: true },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    emoji: { type: String, default: '📅' },
    category: {
      type: String,
      enum: ['festival', 'kulture', 'sport', 'diaspora', 'online', 'fest', 'muzike', 'biznes', 'krijues'],
      default: 'festival',
    },
    isOnline: { type: Boolean, default: false },
    link: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    interested: [interestSchema],
  },
  { timestamps: true }
);

eventSchema.virtual('interestedCount').get(function interestedCount() {
  return this.interested?.length || 0;
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

export default mongoose.model('Event', eventSchema);
