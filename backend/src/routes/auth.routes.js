import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { createOfficer, findUserByEmail } from '../services/userService.js';
import { blacklistToken } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { isEmail, isNonEmptyString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  keyGenerator: (req) => (req.user && req.user.id != null ? `user:${req.user.id}` : `ip:${req.ip}`),
  handler: (req, res) => {
    logger.warn('auth.login_rate_limited', { operation: 'LOGIN_ATTEMPT', email: req.body?.email, ip: req.ip });
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
    logger.info('auth.register_success', { operation: 'REGISTER', userId: id, email: email.trim() });
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
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'invalid_payload', email });
      return fail(res, 'Invalid login credentials', 400);
    }

    const user = await findUserByEmail(email.trim());
    if (!user) {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'user_not_found', email });
      return fail(res, 'Invalid email or password', 401);
    }

    const role = normalizeRole(user.role);
    const status = normalizeStatus(user.status);

    if (role !== 'ADMIN' && role !== 'OFFICER') {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'invalid_role', email, role });
      return fail(res, 'Account configuration error', 403);
    }

    if (status !== 'ACTIVE') {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'inactive', email, status, role });
      return fail(res, 'Account not active.', 403);
    }

    const okPassword = await bcrypt.compare(password, user.password_hash);
    if (!okPassword) {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'bad_password', email });
      return fail(res, 'Invalid email or password', 401);
    }

    const token = jwt.sign(
      { userId: user.id, id: user.id, role, email: user.email, status, full_name: user.full_name },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    logger.info('auth.login_success', { operation: 'LOGIN', userId: user.id, email: user.email, role });

    return ok(res, {
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role, status }
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.user.token;
    const expiresAt = new Date(req.user.exp * 1000);
    
    await blacklistToken(token, expiresAt);
    
    logger.info('auth.logout_success', { operation: 'LOGOUT', userId: req.user.id });
    
    return ok(res, { message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
});

export default router;
