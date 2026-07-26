import { createApp } from './app.js';
import { env } from './config/env.js';
import { db, ensureCoreTables } from './config/db.js';
import { cleanExpiredTokens } from './services/authService.js';
import { logger } from './utils/logger.js';
import * as Sentry from '@sentry/node';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 15);
  const delayMs = Number(process.env.DB_CONNECT_DELAY_MS || 2000);
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await db.query('SELECT 1');
      await ensureCoreTables();
      await cleanExpiredTokens();
      console.log(`CONNECTED TO DB: ${env.db.host} / ${env.db.name} / ${env.db.user}`);
      logger.info('db.connection_established', {
        host: env.db.host,
        database: env.db.name,
        user: env.db.user
      });
      logger.info('auth.expired_tokens_cleanup', { immediate: true });
      break;
    } catch (err) {
      logger.warn('db.connection_retry', {
        attempt,
        maxAttempts,
        error: err.message
      });
      if (attempt >= maxAttempts) {
        console.error('Database connection failed:', err.message);
        logger.error('db.connection_failed', { error: err.message });
        process.exit(1);
      }
      await sleep(delayMs);
    }
  }

  const server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
    logger.info('server.listening', { port: env.port });
  });

  const tokenCleanupIntervalMs = Number(process.env.TOKEN_CLEANUP_INTERVAL_MS || 60 * 60 * 1000);
  const cleanupTimer = setInterval(async () => {
    try {
      await cleanExpiredTokens();
      logger.info('auth.expired_tokens_cleanup', { immediate: false });
    } catch (err) {
      logger.error('auth.expired_tokens_cleanup_failed', { error: err.message });
    }
  }, tokenCleanupIntervalMs);

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

    clearInterval(cleanupTimer);
    clearTimeout(timeout);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
