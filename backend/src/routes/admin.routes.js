import express from 'express';
import { listOfficers, listOfficersPaged, updateOfficerStatus, deleteOfficer } from '../services/userService.js';
import { getMaintenanceStatus, setMaintenanceMode } from '../services/systemService.js';
import { requireAuth, requireRole, requireActiveOfficer } from '../middleware/auth.js';
import { recordAuditEvent } from '../services/auditService.js';
import { ADMIN_ROLES } from '../config/roles.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

import { parsePagination } from '../utils/validators.js';

const router = express.Router();

const OFFICER_STATUS = new Set(['PENDING', 'ACTIVE', 'INACTIVE']);

router.use(requireAuth, requireActiveOfficer, requireRole(...Array.from(ADMIN_ROLES)));

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
    await recordAuditEvent({
      userId: adminId,
      eventType: 'admin.approve_officer',
      resourceType: 'user',
      resourceId: id,
      details: { targetStatus: 'ACTIVE' },
      ipAddress: req.ip
    });
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
    await recordAuditEvent({
      userId: adminId,
      eventType: 'admin.deactivate_officer',
      resourceType: 'user',
      resourceId: id,
      details: { targetStatus: 'INACTIVE' },
      ipAddress: req.ip
    });
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
    const result = await deleteOfficer(id);
    if (!result.affectedRows) {
      logger.warn('admin.delete_officer_not_found', { operation: 'DELETE_OFFICER', adminId, targetUserId: id });
      return fail(res, 'Officer not found', 404);
    }
    const isDeleted = result.action === 'deleted';
    logger.info('admin.delete_officer_success', { operation: 'DELETE_OFFICER', adminId, targetUserId: id, action: result.action });
    await recordAuditEvent({
      userId: adminId,
      eventType: isDeleted ? 'admin.delete_officer' : 'admin.deactivate_officer',
      resourceType: 'user',
      resourceId: id,
      details: { action: result.action, visitCount: result.visitCount },
      ipAddress: req.ip
    });
    return ok(res, {
      deleted: isDeleted,
      deactivated: !isDeleted,
      action: result.action,
      message: !isDeleted
        ? 'Officer has historical visit records and was deactivated to preserve audit history.'
        : 'Officer deleted successfully'
    });
  } catch (err) {
    logger.error('admin.delete_officer_failed', { operation: 'DELETE_OFFICER', adminId, error: err.message });
    return next(err);
  }
});

router.get('/maintenance', async (req, res, next) => {
  try {
    const status = await getMaintenanceStatus(true);
    return ok(res, status);
  } catch (err) {
    return next(err);
  }
});

router.post('/maintenance', async (req, res, next) => {
  const adminId = req.user?.id;
  try {
    const { enabled, message } = req.body || {};
    const status = await setMaintenanceMode({ enabled, message });
    logger.info('admin.update_maintenance_success', { operation: 'UPDATE_MAINTENANCE', adminId, enabled: status.maintenance });
    await recordAuditEvent({
      userId: adminId,
      eventType: 'admin.update_maintenance',
      resourceType: 'system',
      resourceId: 'maintenance_mode',
      details: { maintenance: status.maintenance, message: status.message },
      ipAddress: req.ip
    });
    return ok(res, status);
  } catch (err) {
    logger.error('admin.update_maintenance_failed', { operation: 'UPDATE_MAINTENANCE', adminId, error: err.message });
    return next(err);
  }
});

export default router;
