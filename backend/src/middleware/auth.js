import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { findUserById } from '../services/userService.js';
import { isTokenBlacklisted } from '../services/authService.js';
import { getMaintenanceStatus } from '../services/systemService.js';
import { fail } from '../utils/response.js';
import { logStorage } from '../utils/logger.js';
import { normalizeRole, normalizeStatus } from '../utils/roleUtils.js';
import { ATTENDANCE_ROLES } from '../config/roles.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 'Missing authorization token', 401);
  }

  try {
    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return fail(res, 'Token has been revoked', 401);
    }

    const payload = jwt.verify(token, env.jwt.secret);
    const normalizedRole = normalizeRole(payload?.role);
    const normalizedStatus = normalizeStatus(payload?.status);
    const id = payload?.id ?? payload?.userId;
    const iat = payload?.iat ? payload.iat * 1000 : null;

    // Maintenance Mode & Role-aware Session Revocation Check
    if (normalizedRole !== 'ADMIN') {
      const maintenanceState = await getMaintenanceStatus();
      if (maintenanceState.officers_revoked_at && iat && iat < maintenanceState.officers_revoked_at) {
        return fail(res, 'Token has been revoked', 401);
      }
      if (maintenanceState.maintenance) {
        return fail(res, 'Visitor Hub is temporarily unavailable while maintenance is in progress.', 503, {
          maintenance: true,
          message: maintenanceState.message
        });
      }
    }

    req.user = {
      ...payload,
      id,
      role: normalizedRole,
      status: normalizedStatus,
      token // Store raw token for logout/revocation
    };

    const store = logStorage.getStore();
    if (store) {
      store.userId = id;
    }

    if (env.SENTRY_DSN) {
      Sentry.setUser({ id: String(id) });
    }

    return next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
}

export function requireRole(...roles) {
  const allowed = roles.map((role) => normalizeRole(role)).filter(Boolean);
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!role || !allowed.includes(role)) {
      return fail(res, 'Forbidden', 403);
    }
    return next();
  };
}

export async function requireActiveOfficer(req, res, next) {
  try {
    if (!req.user) {
      return fail(res, 'Missing authorization token', 401);
    }

    const userId = parseInt(req.user.id, 10);
    if (!Number.isInteger(userId)) {
      return fail(res, 'Invalid user', 401);
    }

    // Resolve user from DB to get the latest status and role
    const user = await findUserById(userId);
    if (!user) {
      return fail(res, 'User not found', 401);
    }

    const resolvedRole = normalizeRole(user.role);
    const resolvedStatus = normalizeStatus(user.status);

    // Update req.user with latest data
    req.user.role = resolvedRole;
    req.user.status = resolvedStatus;

    if (resolvedStatus !== 'ACTIVE') {
      return fail(res, 'User account is not active', 403);
    }

    if (ATTENDANCE_ROLES.has(resolvedRole)) {
      return next();
    }

    return fail(res, 'Only active attendance staff may perform this action', 403);
  } catch (err) {
    return next(err);
  }
}
