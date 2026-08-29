import type { Server } from 'node:http';
import process from 'node:process';

import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase, syncIndexes } from './config/database.js';
import { env, isProduction } from './config/env.js';
import { logger } from './config/logger.js';

/**
 * Process lifecycle.
 *
 * The database connects *before* the port opens, so the service never accepts a
 * request it cannot serve. Shutdown is the mirror image: stop accepting
 * connections, drain what is in flight, then close the database.
 */

async function start(): Promise<void> {
  await connectDatabase();

  if (isProduction) {
    // `autoIndex` is off in production, so indexes are built explicitly here —
    // an observable step at boot rather than a surprise on the first query.
    await syncIndexes();
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, environment: env.NODE_ENV },
      `Savewise API listening on http://localhost:${env.PORT}`,
    );
  });

  registerShutdownHandlers(server);
}

function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    // A second Ctrl-C should not start a second teardown.
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    // Force-exit if a hung connection keeps the process alive past the grace
    // period — an orchestrator would SIGKILL us anyway, less tidily.
    const timeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
    timeout.unref();

    server.close(() => {
      void disconnectDatabase().then(() => {
        clearTimeout(timeout);
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // An unhandled rejection leaves the process in an unknown state. Log it
  // loudly and let the supervisor restart us clean rather than limping on.
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start Savewise API');
  process.exit(1);
});
