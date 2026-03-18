import express from 'express';
import { listOfficers, updateOfficerStatus, deleteOfficer } from '../services/userService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/officers', async (req, res, next) => {
  try {
    const officers = await listOfficers();
    return ok(res, officers);
  } catch (err) {
    return next(err);
  }
});

router.put('/officers/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateOfficerStatus(id, 'ACTIVE');
    if (!updated) {
      return fail(res, 'Officer not found', 404);
    }
    return ok(res, { status: 'ACTIVE' });
  } catch (err) {
    return next(err);
  }
});

router.put('/officers/:id/deactivate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateOfficerStatus(id, 'INACTIVE');
    if (!updated) {
      return fail(res, 'Officer not found', 404);
    }
    return ok(res, { status: 'INACTIVE' });
  } catch (err) {
    return next(err);
  }
});

router.delete('/officers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteOfficer(id);
    if (!deleted) {
      return fail(res, 'Officer not found', 404);
    }
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
