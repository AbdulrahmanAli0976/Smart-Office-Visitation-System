import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { findUserById } from '../services/userService.js';
import { isTokenBlacklisted } from '../services/authService.js';
import { fail } from '../utils/response.js';
import { logStorage } from '../utils/logger.js';

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}

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

    if (resolvedRole === 'ADMIN') {
      return next();
    }

    if (resolvedRole !== 'OFFICER') {
      return fail(res, 'Only officers can perform this action', 403);
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
