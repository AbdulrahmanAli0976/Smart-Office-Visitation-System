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

function formatJson(level, event, meta) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    event,
    ...meta
  };
  return JSON.stringify(payload);
}

function writeLine(stream, line) {
  stream.write(`${line}\n`);
}

export const logger = {
  info(event, meta) {
    const line = formatJson('info', event, meta);
    console.log(line);
    writeLine(appStream, line);
  },
  warn(event, meta) {
    const line = formatJson('warn', event, meta);
    console.warn(line);
    writeLine(appStream, line);
  },
  error(event, meta) {
    const line = formatJson('error', event, meta);
    console.error(line);
    writeLine(errorStream, line);
  }
};

export const httpLogStream = {
  write(message) {
    // Morgan logs often end with \n, strip it for consistent JSON if needed
    // But morgan combined format is not JSON. 
    // For pure production hardening, we could use morgan-json
    appStream.write(message);
  }
};
