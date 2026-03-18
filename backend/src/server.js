import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './config/db.js';

async function start() {
  const app = createApp();

  try {
    await db.query('SELECT 1');
    console.log('Database connection established');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

start();
