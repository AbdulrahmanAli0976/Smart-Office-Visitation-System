import express from 'express';
import { getMaintenanceStatus } from '../services/systemService.js';
import { ok } from '../utils/response.js';

const router = express.Router();

router.get('/maintenance', async (req, res, next) => {
  try {
    const status = await getMaintenanceStatus();
    return ok(res, {
      maintenance: status.maintenance,
      message: status.message
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
