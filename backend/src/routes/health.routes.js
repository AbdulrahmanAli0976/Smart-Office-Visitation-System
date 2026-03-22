import express from 'express';
import { db } from '../config/db.js';
import { ok, fail } from '../utils/response.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return ok(res, { 
      status: 'ok', 
      db: 'connected',
      time: new Date().toISOString() 
    });
  } catch (err) {
    return fail(res, {
      status: 'error',
      db: 'disconnected',
      message: err.message
    }, 503);
  }
});

export default router;
