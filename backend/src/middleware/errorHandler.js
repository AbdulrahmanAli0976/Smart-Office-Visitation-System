import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  logger.error('request_failed', {
    status,
    message,
    path: req.originalUrl,
    method: req.method
  });

  return fail(res, message, status);
}
