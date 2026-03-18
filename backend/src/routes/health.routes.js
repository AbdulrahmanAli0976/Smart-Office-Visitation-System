import express from 'express';
import { ok } from '../utils/response.js';

const router = express.Router();

router.get('/', (req, res) => {
  return ok(res, { status: 'ok', time: new Date().toISOString() });
});

export default router;
