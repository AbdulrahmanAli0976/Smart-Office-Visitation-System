import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createOfficer, findUserByEmail } from '../services/userService.js';
import { isEmail, isNonEmptyString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

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
    return ok(res, {
      id,
      status: 'PENDING',
      message: 'Registration submitted. Await admin approval.'
    }, 201);
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
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

    if (user.status !== 'ACTIVE') {
      logger.warn('auth.login_failed', { reason: 'inactive', email, status: user.status });
      return fail(res, 'Account not active. Await approval or contact admin.', 403);
    }

    const okPassword = await bcrypt.compare(password, user.password_hash);
    if (!okPassword) {
      logger.warn('auth.login_failed', { reason: 'bad_password', email });
      return fail(res, 'Invalid email or password', 401);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    return ok(res, {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
