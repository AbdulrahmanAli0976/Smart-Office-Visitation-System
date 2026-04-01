import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './config/db.js';
import { logger } from './utils/logger.js';
import * as Sentry from '@sentry/node';

async function start() {
  const app = createApp();

  logger.info('server.starting', { env: env.nodeEnv, port: env.port });

  const handleFatal = (err, origin) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('process.unhandled', { origin, message });
    if (env.SENTRY_DSN) {
      Sentry.captureException(err instanceof Error ? err : new Error(message));
    }
  };

  process.on('unhandledRejection', (reason) => handleFatal(reason, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    handleFatal(err, 'uncaughtException');
    process.exit(1);
  });

  try {
    await db.query('SELECT 1');
    console.log('Database connection established');
    logger.info('db.connection_established');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    logger.error('db.connection_failed', { error: err.message });
  }

  const server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
    logger.info('server.listening', { port: env.port });
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    logger.warn('server.shutdown_signal', { signal });
    
    // Set a shutdown timeout
    const timeout = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit.');
      logger.error('server.shutdown_timeout');
      process.exit(1);
    }, 10000); // 10 seconds

    try {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('HTTP server closed.');
      logger.info('server.http_closed');
    } catch (err) {
      console.error('Error closing HTTP server:', err.message);
      logger.error('server.http_close_failed', { error: err.message });
    }

    try {
      await db.pool.end();
      console.log('Database pool closed.');
      logger.info('db.pool_closed');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
      logger.error('db.pool_close_failed', { error: err.message });
    }

    clearTimeout(timeout);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
