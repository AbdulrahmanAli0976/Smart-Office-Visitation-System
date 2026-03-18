import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findUserById } from '../services/userService.js';
import { fail } from '../utils/response.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 'Missing authorization token', 401);
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
    return next();
  } catch (err) {
    return fail(res, 'Invalid or expired token', 401);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
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

    if (req.user.role !== 'OFFICER') {
      return fail(res, 'Only officers can perform this action', 403);
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return fail(res, 'Invalid user', 401);
    }

    if (user.status !== 'ACTIVE') {
      return fail(res, 'Officer account is not active', 403);
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
