import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import visitorRoutes from './routes/visitors.routes.js';
import visitRoutes from './routes/visits.routes.js';
import healthRoutes from './routes/health.routes.js';
import reportRoutes from './routes/reports.routes.js';
import debugRoutes from './routes/debug.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fail } from './utils/response.js';
import { httpLogStream, logStorage, logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  const sentryEnabled = Boolean(env.SENTRY_DSN);

  // Request ID & Logging Context (FIRST)
  app.use((req, res, next) => {
    req.requestId = uuidv4();
    res.setHeader('X-Request-Id', req.requestId);
    const safeRoute = `${req.baseUrl}${req.path}`;
    req.safeRoute = safeRoute;
    logStorage.run({ requestId: req.requestId, route: safeRoute }, next);
  });

  app.set('trust proxy', true);
  app.set('sentryEnabled', sentryEnabled);

  if (sentryEnabled) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1.0
    });

    if (Sentry.Handlers?.requestHandler) {
      app.use(Sentry.Handlers.requestHandler());
    }
  }

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  if (sentryEnabled) {
    app.use((req, res, next) => {
      const safeRoute = req.safeRoute || `${req.baseUrl}${req.path}`;
      Sentry.setUser({ id: req.user?.id || null });
      Sentry.setContext('request', {
        requestId: req.requestId,
        route: safeRoute
      });
      next();
    });
  }

  // Audit logging (no sensitive payloads)
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const safeRoute = req.safeRoute || `${req.baseUrl}${req.path}`;
      logger.info('audit.request', {
        requestId: req.requestId,
        userId: req.user?.id ?? null,
        route: safeRoute,
        role: req.user?.role ?? null,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    });
    next();
  });

  if (env.nodeEnv === 'production') {
    app.use(morgan(env.httpLogFormat, { stream: httpLogStream }));
  } else {
    app.use(morgan('dev'));
  }

  const limiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user && req.user.id != null ? `user:${req.user.id}` : `ip:${req.ip}`),
    handler: (req, res) => fail(res, 'Too many requests, please slow down.', 429)
  });

  const visitorSearchLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: Math.min(env.rateLimit.max, 60),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user && req.user.id != null ? `user:${req.user.id}` : `ip:${req.ip}`),
    handler: (req, res) => fail(res, 'Too many search requests, please slow down.', 429)
  });

  const reportsLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: Math.min(env.rateLimit.max, 120),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user && req.user.id != null ? `user:${req.user.id}` : `ip:${req.ip}`),
    handler: (req, res) => fail(res, 'Too many report requests, please slow down.', 429)
  });

  const exportLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: Math.min(env.rateLimit.max, 30),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user && req.user.id != null ? `user:${req.user.id}` : `ip:${req.ip}`),
    handler: (req, res) => fail(res, 'Too many export requests, please slow down.', 429)
  });

  app.use('/api', limiter);
  app.use('/api/visitors/search', visitorSearchLimiter);
  app.use('/api/reports', reportsLimiter);
  app.use('/api/visits/export', exportLimiter);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/visitors', visitorRoutes);
  app.use('/api/visits', visitRoutes);
  app.use('/api/reports', reportRoutes);
  if (env.debugRoutesEnabled) {
    app.use('/api/debug', debugRoutes);
  }


  app.use((req, res) => {
    return fail(res, 'Route not found', 404);
  });

  app.use(errorHandler);

  if (sentryEnabled) {
    if (typeof Sentry.setupExpressErrorHandler === 'function') {
      Sentry.setupExpressErrorHandler(app);
    } else if (Sentry.Handlers?.errorHandler) {
      app.use(Sentry.Handlers.errorHandler());
    }
  }

  return app;
}
