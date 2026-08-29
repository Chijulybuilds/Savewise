import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
// Named, not default. `pino-http` is a CommonJS package whose `.d.ts` declares
// ESM exports, so under Node's real resolution its "default" is the whole
// `module.exports` namespace — an object, not a callable. The package exports
// `PinoHttp as pinoHttp` for exactly this reason.
import { pinoHttp } from 'pino-http';

import { allowedOrigins, env, isProduction, isTest } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { requestContext } from './middleware/requestContext.js';
import routes from './routes/index.js';
import { AppError } from './utils/AppError.js';

// Side-effect import: registers every model so `ref:` resolution and index
// synchronisation see the complete set regardless of which route loads first.
import './models/index.js';

/**
 * Express application.
 *
 * Built as a factory that returns an app without listening or connecting, so
 * the test suite can mount it against an in-memory MongoDB with `supertest`
 * while `server.ts` owns the real process lifecycle.
 *
 * Middleware order matters and is deliberate:
 *   context → security headers → CORS → parsers → rate limit → routes → errors
 */
export function createApp(): Express {
  const app = express();

  // Required for correct `req.ip` behind a reverse proxy, which the rate
  // limiter keys on. Trusting one hop rather than `true` prevents a client from
  // spoofing `X-Forwarded-For` to bypass the limit.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestContext);

  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => (req as { id?: string }).id ?? '',
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      }),
    );
  }
// to the best app to be used. 
  app.use(
    helmet({
      // The API serves JSON, not HTML, so the strictest CSP is also the
      // simplest: nothing may be loaded from a response at all.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(
    cors({
      // An explicit allowlist, not a reflector. `credentials: true` with a
      // reflected origin would let any site read an authenticated response.
      origin(origin, callback) {
        // Same-origin and server-to-server requests send no Origin header.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
        callback(new AppError(403, 'FORBIDDEN', 'Origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86_400,
    }),
  );

  // A 100kb cap: no legitimate Savewise request is larger, and an unbounded
  // body parser is a trivial memory-exhaustion vector.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(compression());

  app.get('/health', (_req, res) => {
    const healthy = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        status: healthy ? 'ok' : 'degraded',
        database: healthy ? 'connected' : 'disconnected',
        uptime: Math.round(process.uptime()),
        environment: env.NODE_ENV,
      },
    });
  });

  app.use('/api', apiRateLimit, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
