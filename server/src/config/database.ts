import mongoose from 'mongoose';

import { env, isProduction } from './env.js';
import { logger } from './logger.js';

/**
 * MongoDB connection lifecycle.
 */

// Reject writes containing keys the schema does not define, instead of silently
// dropping them. Combined with `.strict()` Zod schemas at the API edge, this
// closes mass-assignment from both directions.
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

if (!isProduction) {
  mongoose.set('autoIndex', true);
}

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return mongoose;
  if (connecting) return connecting;

  connecting = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      // Indexes are built explicitly at boot in production so a cold start
      // cannot race the first query.
      autoIndex: !isProduction,
      maxPoolSize: 20,
      minPoolSize: 2,
    })
    .then((connection) => {
      logger.info({ database: connection.connection.name }, 'Connected to MongoDB');
      return connection;
    })
    .catch((error: unknown) => {
      connecting = null;
      throw error;
    });

  mongoose.connection.on('error', (error) => {
    logger.error({ err: error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  return connecting;
}

export async function disconnectDatabase(): Promise<void> {
  connecting = null;
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

/**
 * Build every declared index before accepting traffic. In production
 * `autoIndex` is off so that this is a deliberate, observable step.
 */
export async function syncIndexes(): Promise<void> {
  const models = Object.values(mongoose.models);
  await Promise.all(models.map((model) => model.createIndexes()));
  logger.info({ models: models.length }, 'Database indexes ready');
}
