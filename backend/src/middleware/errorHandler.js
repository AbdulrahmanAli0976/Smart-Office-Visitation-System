import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  const message = isProduction && status === 500 ? 'Internal server error' : err.message;

  logger.error('request_failed', {
    status,
    message: err.message,
    route: req.safeRoute || req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?.id ?? null,
    stack: !isProduction ? err.stack : undefined
  });

  fail(res, message, status);

  if (req.app?.get('sentryEnabled')) {
    return next(err);
  }
}
