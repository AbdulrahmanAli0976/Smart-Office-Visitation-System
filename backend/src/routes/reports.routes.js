import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSummary } from '../services/reportService.js';

const router = express.Router();

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query || {};

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const summary = await getSummary({ from, to });
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
});

export default router;
