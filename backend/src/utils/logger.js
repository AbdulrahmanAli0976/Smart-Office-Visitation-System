import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const logsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const appLogPath = path.join(logsDir, 'app.log');
const errorLogPath = path.join(logsDir, 'error.log');

const appStream = fs.createWriteStream(appLogPath, { flags: 'a' });
const errorStream = fs.createWriteStream(errorLogPath, { flags: 'a' });

function formatLine(level, message, meta) {
  const timestamp = new Date().toISOString();
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()} ${message}${payload}`;
}

function writeLine(stream, line) {
  stream.write(`${line}\n`);
}

export const logger = {
  info(message, meta) {
    const line = formatLine('info', message, meta);
    console.log(line);
    writeLine(appStream, line);
  },
  warn(message, meta) {
    const line = formatLine('warn', message, meta);
    console.warn(line);
    writeLine(appStream, line);
  },
  error(message, meta) {
    const line = formatLine('error', message, meta);
    console.error(line);
    writeLine(errorStream, line);
  }
};

export const httpLogStream = {
  write(message) {
    appStream.write(message);
  }
};
