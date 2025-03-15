// lib/mongodb.ts
import mongoose from 'mongoose';

// Define the type for the cached mongoose instance
interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use a simple object instead of trying to add to the global object
// This works because Next.js handles serverless functions differently
const globalMongo: { connection?: MongooseConnection } = {};

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

async function dbConnect(): Promise<typeof mongoose> {
  // If we have an existing connection, use it
  if (globalMongo.connection?.conn) {
    return globalMongo.connection.conn;
  }

  // Initialize the connection object if it doesn't exist
  if (!globalMongo.connection) {
    globalMongo.connection = {
      conn: null,
      promise: null
    };
  }

  // If we don't have a promise to connect yet, create one
  if (!globalMongo.connection.promise) {
    const opts = {
      bufferCommands: false,
    };

    globalMongo.connection.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    // Await and store the connection
    globalMongo.connection.conn = await globalMongo.connection.promise;
  } catch (error) {
    // Reset the promise on error
    globalMongo.connection.promise = null;
    throw error;
  }

  return globalMongo.connection.conn;
}

export default dbConnect;