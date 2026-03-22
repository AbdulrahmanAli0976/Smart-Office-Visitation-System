import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { createOfficer, findUserByEmail } from '../services/userService.js';
import { isEmail, isNonEmptyString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  handler: (req, res) => {
    logger.warn('auth.login_rate_limited', { email: req.body?.email, ip: req.ip });
    return fail(res, 'Too many login attempts. Please try again later.', 429);
  }
});

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body || {};

    if (!isNonEmptyString(full_name) || !isEmail(email) || !isNonEmptyString(password)) {
      return fail(res, 'Invalid registration data', 400);
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return fail(res, 'Email already registered', 409);
    }

    const id = await createOfficer({ fullName: full_name.trim(), email: email.trim(), password });
    logger.info('auth.register_success', { userId: id, email: email.trim() });
    return ok(res, {
      id,
      status: 'PENDING',
      message: 'Registration submitted. Await admin approval.'
    }, 201);
  } catch (err) {
    return next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!isEmail(email) || !isNonEmptyString(password)) {
      logger.warn('auth.login_failed', { reason: 'invalid_payload', email });
      return fail(res, 'Invalid login credentials', 400);
    }

    const user = await findUserByEmail(email.trim());
    if (!user) {
      logger.warn('auth.login_failed', { reason: 'user_not_found', email });
      return fail(res, 'Invalid email or password', 401);
    }

    const role = normalizeRole(user.role);
    const status = normalizeStatus(user.status);

    const isAdmin = role === 'ADMIN';

    if (!role) {
      logger.warn('auth.login_failed', { reason: 'missing_role', email });
      return fail(res, 'Account configuration error', 403);
    }

    if (role !== 'ADMIN' && role !== 'OFFICER') {
      logger.warn('auth.login_failed', { reason: 'invalid_role', email, role });
      return fail(res, 'Account configuration error', 403);
    }

    if (!isAdmin && role === 'OFFICER' && status !== 'ACTIVE') {
      logger.warn('auth.login_failed', { reason: 'inactive', email, status });
      return fail(res, 'Account not active. Await approval or contact admin.', 403);
    }

    const okPassword = await bcrypt.compare(password, user.password_hash);
    if (!okPassword) {
      logger.warn('auth.login_failed', { reason: 'bad_password', email });
      return fail(res, 'Invalid email or password', 401);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        role,
        email: user.email,
        status,
        full_name: user.full_name
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    logger.info('auth.login_success', { userId: user.id, email: user.email, role });

    return ok(res, {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role,
        status
      }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
