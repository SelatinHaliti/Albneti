import mongoose from 'mongoose';

/**
 * Lidhja me MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB i lidhur: ${conn.connection.host}`);
  } catch (error) {
    console.error('Gabim në lidhjen me MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;
