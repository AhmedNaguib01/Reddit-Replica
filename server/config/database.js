const mongoose = require('mongoose');

// On serverless platforms (Vercel) the module is re-evaluated per cold start but
// the Node process is reused between invocations, so the connection promise is
// cached on globalThis to avoid opening a new pool on every request.
let cached = globalThis.__mongooseCache;
if (!cached) {
  cached = globalThis.__mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }).catch((error) => {
      // Clear the cached promise so the next request can retry the connection
      cached.promise = null;
      throw error;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
