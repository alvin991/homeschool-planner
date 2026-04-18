import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error(
    'Missing MONGODB_URI. Add it to .env (see .env.example). Next.js loads .env automatically for dev and build.',
  );
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache;
if (!cached) {
  global.mongooseCache = { conn: null, promise: null };
  cached = global.mongooseCache;
}

async function dbConnect() {
  if (!cached) {
    throw new Error('Mongoose cache is not initialized');
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
