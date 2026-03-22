import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findUserById } from '../services/userService.js';
import { fail } from '../utils/response.js';

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 'Missing authorization token', 401);
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const normalizedRole = normalizeRole(payload?.role);
    const normalizedStatus = normalizeStatus(payload?.status);
    const id = payload?.id ?? payload?.userId;

    req.user = {
      ...payload,
      id,
      role: normalizedRole,
      status: normalizedStatus
    };
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

    const role = normalizeRole(req.user.role);
    const userId = parseInt(req.user.id, 10);
    if (!Number.isInteger(userId)) {
      return fail(res, 'Invalid user', 401);
    }

    // Admin always allowed
    if (role === 'ADMIN') {
      return next();
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

    if (resolvedRole === 'ADMIN') {
      return next();
    }

    if (resolvedRole !== 'OFFICER') {
      return fail(res, 'Only officers can perform this action', 403);
    }

    if (resolvedStatus !== 'ACTIVE') {
      return fail(res, 'Officer account is not active', 403);
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
