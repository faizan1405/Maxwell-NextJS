import mongoose from 'mongoose';
import { seedDatabase } from './db';

// MONGODB_URI must be set in .env.local (or the deployment environment).
// The app will refuse to start without it.
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Caches the Mongoose connection on the global object to prevent connection
 * exhaustion during Next.js hot reloads in development.
 *
 * Problem: Next.js API routes are re-evaluated on every hot reload. Without
 * caching, each reload would open a new connection to MongoDB, eventually
 * exhausting the connection pool.
 *
 * Solution: We store the connection promise on `global.mongoose` so it
 * persists across module re-evaluations, and reuse the same connection.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Opens (or reuses) the MongoDB connection and runs one-time database seeding.
 *
 * Connection lifecycle:
 *   1. Return the cached connection immediately if it exists.
 *   2. Initiate a new connection promise if one is not already in flight.
 *   3. Await the connection, then run `seedDatabase()` exactly once per
 *      process lifetime (guarded by `cached.seeded`).
 *      - If seeding fails, `cached.seedPromise` is reset so it can be
 *        retried on the next request rather than hanging indefinitely.
 *   4. On any connection error, clear `cached.promise` so the next call
 *      can attempt a fresh reconnect.
 *
 * @returns {Promise<typeof mongoose>} The connected Mongoose instance.
 */
export async function connectToDatabase() {
  // Reuse an already-established connection
  if (cached.conn) {
    return cached.conn;
  }

  // Initiate the connection only once; subsequent concurrent calls will
  // await the same promise rather than opening parallel connections.
  if (!cached.promise) {
    const opts = {
      // Disable Mongoose command buffering so operations fail fast
      // if the connection isn't ready, rather than silently queuing.
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;

    // Run database seeding once per process. The seedPromise guard prevents
    // concurrent seed calls when multiple requests arrive before seeding
    // completes. If seeding throws, seedPromise is cleared so the next
    // request can retry.
    if (!cached.seeded) {
      if (!cached.seedPromise) {
        cached.seedPromise = seedDatabase()
          .then(() => {
            cached.seeded = true;
          })
          .catch((err) => {
            cached.seedPromise = null;
            throw err;
          });
      }
      await cached.seedPromise;
    }
  } catch (e) {
    // Clear the promise so the next request attempts a fresh connection
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
