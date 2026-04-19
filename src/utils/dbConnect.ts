import mongoose, { Mongoose } from 'mongoose';

declare global {
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

function requireMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'Missing MONGODB_URI. Add it to .env (see .env.example). In Docker, set it via env_file / container env.',
    );
  }
  return uri;
}

async function dbConnect() {
  if (!cached) {
    throw new Error('Mongoose cache is not initialized');
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(requireMongoUri(), {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
