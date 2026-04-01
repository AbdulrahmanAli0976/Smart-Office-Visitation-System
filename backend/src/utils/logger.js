import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '../config/env.js';

const logsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../logs');
fs.mkdirSync(logsDir, { recursive: true });

export const logStorage = new AsyncLocalStorage();

const jsonFormatter = winston.format((info) => {
  const context = logStorage.getStore() || {};
  info.requestId = context.requestId || null;
  info.userId = context.userId || null;
  info.route = context.route || null;
  info.timestamp = new Date().toISOString();
  return info;
});

const transport = new DailyRotateFile({
  filename: path.join(logsDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: env.logLevel || 'info'
});

const errorTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error'
});

const appFileTransport = new winston.transports.File({
  filename: path.join(logsDir, 'app.log'),
  level: env.logLevel || 'info'
});

const errorFileTransport = new winston.transports.File({
  filename: path.join(logsDir, 'error.log'),
  level: 'error'
});

const winstonLogger = winston.createLogger({
  level: env.logLevel || 'info',
  format: winston.format.combine(
    jsonFormatter(),
    winston.format.json()
  ),
  transports: [
    transport,
    errorTransport,
    appFileTransport,
    errorFileTransport,
    new winston.transports.Console()
  ]
});

function buildContext() {
  const store = logStorage.getStore();
  return {
    requestId: store?.requestId || null,
    route: store?.route || null,
    userId: store?.userId || null
  };
}

export const logger = {
  info(event, meta) {
    winstonLogger.info({ message: event, ...buildContext(), ...meta });
  },
  warn(event, meta) {
    winstonLogger.warn({ message: event, ...buildContext(), ...meta });
  },
  error(event, meta) {
    winstonLogger.error({ message: event, ...buildContext(), ...meta });
  }
};

export const httpLogStream = {
  write(message) {
    winstonLogger.info({ message: 'http_request', detail: message.trim(), ...buildContext() });
  }
};
