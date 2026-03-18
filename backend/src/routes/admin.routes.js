import express from 'express';
import { listOfficers, updateOfficerStatus, deleteOfficer } from '../services/userService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/officers', async (req, res, next) => {
  try {
    const officers = await listOfficers();
    return res.json(officers);
  } catch (err) {
    return next(err);
  }
});

router.put('/officers/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateOfficerStatus(id, 'ACTIVE');
    if (!updated) {
      return res.status(404).json({ error: 'Officer not found' });
    }
    return res.json({ status: 'ACTIVE' });
  } catch (err) {
    return next(err);
  }
});

router.put('/officers/:id/deactivate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateOfficerStatus(id, 'INACTIVE');
    if (!updated) {
      return res.status(404).json({ error: 'Officer not found' });
    }
    return res.json({ status: 'INACTIVE' });
  } catch (err) {
    return next(err);
  }
});

router.delete('/officers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteOfficer(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Officer not found' });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
