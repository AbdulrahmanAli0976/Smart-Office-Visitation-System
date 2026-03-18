import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import visitorRoutes from './routes/visitors.routes.js';
import visitRoutes from './routes/visits.routes.js';
import healthRoutes from './routes/health.routes.js';
import reportRoutes from './routes/reports.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fail } from './utils/response.js';
import { httpLogStream } from './utils/logger.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

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
    handler: (req, res) => fail(res, 'Too many requests, please slow down.', 429)
  });

  app.use('/api', limiter);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/visitors', visitorRoutes);
  app.use('/api/visits', visitRoutes);
  app.use('/api/reports', reportRoutes);

  app.use((req, res) => {
    return fail(res, 'Route not found', 404);
  });

  app.use(errorHandler);

  return app;
}
