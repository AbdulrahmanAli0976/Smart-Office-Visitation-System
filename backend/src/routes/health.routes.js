import express from 'express';
import { db } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await db.queryWithTimeout('SELECT 1', [], 2000);
    return res.status(200).json({
      status: 'OK',
      database: 'UP'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'ERROR',
      database: 'DOWN'
    });
  }
});

export default router;
