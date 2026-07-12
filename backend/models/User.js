import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Emri i përdoruesit është i detyrueshëm'],
      unique: true,
      trim: true,
      minlength: [3, 'Emri duhet të ketë të paktën 3 karaktere'],
      maxlength: [30, 'Emri nuk mund të kalojë 30 karaktere'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email është i detyrueshëm'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Vendosni një email të vlefshëm'],
      index: true,
    },
    password: {
      type: String,
      minlength: [6, 'Fjalëkalimi duhet të ketë të paktën 6 karaktere'],
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    appleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'apple'],
      default: 'local',
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [50, 'Emri i plotë nuk mund të kalojë 50 karaktere'],
    },
    avatar: {
      type: String,
      default: '',
    },
    avatarPublicId: {
      type: String,
      default: '',
      select: false,
    },
    bio: {
      type: String,
      maxlength: [150, 'Bio nuk mund të kalojë 150 karaktere'],
      default: '',
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Faqja e internetit nuk mund të kalojë 200 karaktere'],
      default: '',
    },
    location: {
      type: String,
      maxlength: [100, 'Vendndodhja nuk mund të kalojë 100 karaktere'],
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedSubscription: {
      plan: { type: String, enum: ['none', 'monthly', 'yearly'], default: 'none' },
      status: { type: String, enum: ['none', 'active', 'expired', 'cancelled'], default: 'none' },
      subscribedAt: Date,
      expiresAt: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
    },
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    eventPromoOptOut: { type: Boolean, default: false },
    eventCategoryInterests: [{ type: String }],
    lastActiveAt: { type: Date, default: Date.now },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

userSchema.index({ username: 'text', fullName: 'text' });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('validate', function (next) {
  if (!this.isNew && !this.isModified('password')) return next();
  if (!this.password && !this.googleId && !this.appleId) {
    this.invalidate('password', 'Fjalëkalimi është i detyrueshëm');
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  return obj;
};

export default mongoose.model('User', userSchema);
