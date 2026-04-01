import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ok } from '../utils/response.js';

const router = express.Router();

router.use(requireAuth);

router.get('/sentry-test', (req, res, next) => {
  const err = new Error('Sentry test error');
  err.code = 'SENTRY_TEST';
  next(err);
});

router.get('/ping', (req, res) => ok(res, { message: 'debug route is active' }));

export default router;
