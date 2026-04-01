import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseEnv = path.join(rootDir, '.env');

if (fs.existsSync(baseEnv)) {
  dotenv.config({ path: baseEnv });
}

const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  path.join(rootDir, '.env.local'),
  path.join(rootDir, `.env.${nodeEnv}`),
  path.join(rootDir, `.env.${nodeEnv}.local`)
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }
}

const requireProduction = nodeEnv === 'production';
const corsOriginRaw = process.env.CORS_ORIGIN ?? (requireProduction ? '' : 'http://localhost:5173');
const corsOrigins = corsOriginRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin) => origin !== '*');

if (!corsOrigins.length) {
  throw new Error('FATAL: CORS_ORIGIN must be set to one or more allowed origins ("*" is not permitted)');
}

const corsOrigin = corsOrigins.length > 1 ? corsOrigins : corsOrigins[0];

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || !String(jwtSecret).trim()) {
  throw new Error('FATAL: JWT_SECRET is required but missing from .env');
}

function ensureEnv(name) {
  const value = process.env[name];
  if (value === undefined || String(value).trim() === '') {
    throw new Error(`FATAL: ${name} is required when NODE_ENV=${nodeEnv}`);
  }
  return value;
}

if (requireProduction) {
  ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'].forEach(ensureEnv);
}

const safeEnv = (name, fallback) => {
  if (requireProduction) {
    return process.env[name];
  }
  return process.env[name] || fallback;
};

const dbHost = safeEnv('DB_HOST', 'localhost');
const dbUser = safeEnv('DB_USER', 'root');
const dbName = safeEnv('DB_NAME', 'visitor_management');
const rawDbPort = safeEnv('DB_PORT', '3306');
const dbPassword = requireProduction ? process.env.DB_PASSWORD : process.env.DB_PASSWORD || '';
const sentryDsn = process.env.SENTRY_DSN || '';
const debugRoutesEnabled = String(process.env.DEBUG_ROUTES_ENABLED ?? '').toLowerCase() === 'true';

if (!process.env.DB_NAME) {
  console.warn('WARNING: DB_NAME not set, defaulting to visitor_management');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  db: {
    host: dbHost,
    port: Number(rawDbPort || 3306),
    user: dbUser,
    password: dbPassword,
    name: dbName
  },
  jwt: {
    secret: String(jwtSecret),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  },
  corsOrigin,
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300)
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  httpLogFormat: process.env.HTTP_LOG_FORMAT || (nodeEnv === 'production' ? 'combined' : 'dev'),
  sentryDsn,
  SENTRY_DSN: sentryDsn,
  debugRoutesEnabled
};
