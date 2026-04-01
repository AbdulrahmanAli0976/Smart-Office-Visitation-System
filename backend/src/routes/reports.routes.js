import express from 'express';
import { requireAuth, requireActiveOfficer, requireRole } from '../middleware/auth.js';
import { getSummary, getDashboardMetrics, getVisitorsPerDay, getVisitorTypeDistribution } from '../services/reportService.js';
import { ok, fail } from '../utils/response.js';

const router = express.Router();

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// All reports require active officer or admin
router.use(requireAuth, requireActiveOfficer);

router.get('/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query || {};

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return fail(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const summary = await getSummary({ from, to });
    return ok(res, summary);
  } catch (err) {
    return next(err);
  }
});

router.get('/dashboard', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const metrics = await getDashboardMetrics();
    return ok(res, metrics);
  } catch (err) {
    return next(err);
  }
});

router.get('/visitors-per-day', async (req, res, next) => {
  try {
    const { from, to } = req.query || {};

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return fail(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const rows = await getVisitorsPerDay({ from, to });
    return ok(res, rows);
  } catch (err) {
    return next(err);
  }
});

router.get('/visitor-types', async (req, res, next) => {
  try {
    const { from, to } = req.query || {};

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return fail(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    const rows = await getVisitorTypeDistribution({ from, to });
    return ok(res, rows);
  } catch (err) {
    return next(err);
  }
});

export default router;
