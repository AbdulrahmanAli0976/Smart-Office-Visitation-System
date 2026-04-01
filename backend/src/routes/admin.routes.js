import express from 'express';
import { listOfficers, listOfficersPaged, updateOfficerStatus, deleteOfficer } from '../services/userService.js';
import { requireAuth, requireRole, requireActiveOfficer } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const OFFICER_STATUS = new Set(['PENDING', 'ACTIVE', 'INACTIVE']);

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || 10, 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

router.use(requireAuth, requireActiveOfficer, requireRole('ADMIN'));

router.get('/officers', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query || {});
    const search = req.query?.search || '';
    const status = req.query?.status || '';
    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus && !OFFICER_STATUS.has(normalizedStatus)) {
      return fail(res, 'Invalid status', 400);
    }

    const { rows, total } = await listOfficersPaged({
      search,
      status: normalizedStatus,
      limit,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.put('/officers/:id/approve', async (req, res, next) => {
  const adminId = req.user?.id;
  try {
    const { id } = req.params;
    const updated = await updateOfficerStatus(id, 'ACTIVE');
    if (!updated) {
      logger.warn('admin.approve_officer_not_found', { operation: 'APPROVE_OFFICER', adminId, targetUserId: id });
      return fail(res, 'Officer not found', 404);
    }
    logger.info('admin.approve_officer_success', { operation: 'APPROVE_OFFICER', adminId, targetUserId: id });
    return ok(res, { status: 'ACTIVE' });
  } catch (err) {
    logger.error('admin.approve_officer_failed', { operation: 'APPROVE_OFFICER', adminId, error: err.message });
    return next(err);
  }
});

router.put('/officers/:id/deactivate', async (req, res, next) => {
  const adminId = req.user?.id;
  try {
    const { id } = req.params;
    const updated = await updateOfficerStatus(id, 'INACTIVE');
    if (!updated) {
      logger.warn('admin.deactivate_officer_not_found', { operation: 'DEACTIVATE_OFFICER', adminId, targetUserId: id });
      return fail(res, 'Officer not found', 404);
    }
    logger.info('admin.deactivate_officer_success', { operation: 'DEACTIVATE_OFFICER', adminId, targetUserId: id });
    return ok(res, { status: 'INACTIVE' });
  } catch (err) {
    logger.error('admin.deactivate_officer_failed', { operation: 'DEACTIVATE_OFFICER', adminId, error: err.message });
    return next(err);
  }
});

router.delete('/officers/:id', async (req, res, next) => {
  const adminId = req.user?.id;
  try {
    const { id } = req.params;
    const deleted = await deleteOfficer(id);
    if (!deleted) {
      logger.warn('admin.delete_officer_not_found', { operation: 'DELETE_OFFICER', adminId, targetUserId: id });
      return fail(res, 'Officer not found', 404);
    }
    logger.info('admin.delete_officer_success', { operation: 'DELETE_OFFICER', adminId, targetUserId: id });
    return ok(res, { deleted: true });
  } catch (err) {
    logger.error('admin.delete_officer_failed', { operation: 'DELETE_OFFICER', adminId, error: err.message });
    return next(err);
  }
});

export default router;
