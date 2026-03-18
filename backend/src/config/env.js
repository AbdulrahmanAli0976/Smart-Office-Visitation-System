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

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'visitor_management'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
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

if (env.nodeEnv === 'production') {
  if (!process.env.JWT_SECRET || env.jwt.secret === 'change-me') {
    throw new Error('JWT_SECRET must be set for production');
  }
}
