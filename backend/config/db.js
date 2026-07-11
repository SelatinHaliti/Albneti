import mongoose from 'mongoose';

/**
 * Lidhja me MongoDB
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error('MONGODB_URI mungon në backend/.env — shto connection string nga MongoDB Atlas.');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB i lidhur: ${conn.connection.host}`);
  } catch (error) {
    console.error('Gabim në lidhjen me MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;
