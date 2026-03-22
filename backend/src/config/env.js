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

const corsOriginRaw = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigins = corsOriginRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin = corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] || '*';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || !String(jwtSecret).trim()) {
  throw new Error('FATAL: JWT_SECRET is required but missing from .env');
}

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbName = process.env.DB_NAME || 'visitor_management';

if (!process.env.DB_NAME) {
  console.warn('WARNING: DB_NAME not set, defaulting to visitor_management');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  db: {
    host: dbHost,
    port: Number(process.env.DB_PORT || 3306),
    user: dbUser,
    password: process.env.DB_PASSWORD || '',
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
  httpLogFormat: process.env.HTTP_LOG_FORMAT || (nodeEnv === 'production' ? 'combined' : 'dev')
};
