import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findUserById } from '../services/userService.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export async function requireActiveOfficer(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    if (req.user.role !== 'OFFICER') {
      return res.status(403).json({ error: 'Only officers can perform this action' });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Officer account is not active' });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}
