import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createOfficer, findUserByEmail } from '../services/userService.js';
import { blacklistToken } from '../services/authService.js';
import { recordAuditEvent } from '../services/auditService.js';
import { applyProgressiveDelay, recordFailedAttempt, resetAttempts } from '../services/loginThrottler.js';
import { getMaintenanceStatus } from '../services/systemService.js';
import { requireAuth } from '../middleware/auth.js';
import { ACTIVE_ROLES, USER_ROLES } from '../config/roles.js';
import { isEmail, isNonEmptyString, isStrongPassword } from '../utils/validators.js';
import { normalizeRole, normalizeStatus } from '../utils/roleUtils.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body || {};

    if (!isNonEmptyString(full_name) || !isEmail(email) || !isStrongPassword(password)) {
      return fail(res, 'Invalid registration data. Use a valid email and a strong password (12+ chars with upper/lowercase, number, and symbol).', 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return fail(res, 'Email already registered', 409);
    }

    const id = await createOfficer({ fullName: full_name.trim(), email: normalizedEmail, password });
    logger.info('auth.register_success', { operation: 'REGISTER', userId: id, email: normalizedEmail });
    await recordAuditEvent({
      userId: id,
      eventType: 'user.register',
      resourceType: 'user',
      resourceId: id,
      details: { email: normalizedEmail, role: USER_ROLES.OFFICER, status: 'PENDING' },
      ipAddress: req.ip
    });
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
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // 1. Apply progressive delay (scoped to IP + normalizedEmail)
    await applyProgressiveDelay(req.ip, normalizedEmail);

    // 2. Validate payload format
    if (!isEmail(normalizedEmail) || !isNonEmptyString(password)) {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'invalid_payload', email: normalizedEmail });
      const failedCount = recordFailedAttempt(req.ip, normalizedEmail);
      if (failedCount >= 6) {
        res.setHeader('Retry-After', '30');
        return fail(res, 'Too many sign-in attempts. Please wait a moment before trying again.', 429, { retryAfter: 30 });
      }
      return fail(res, 'Unable to sign in with those credentials.', 400);
    }

    // 3. Find user
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'user_not_found', email: normalizedEmail });
      const failedCount = recordFailedAttempt(req.ip, normalizedEmail);
      if (failedCount >= 6) {
        res.setHeader('Retry-After', '30');
        return fail(res, 'Too many sign-in attempts. Please wait a moment before trying again.', 429, { retryAfter: 30 });
      }
      return fail(res, 'Unable to sign in with those credentials.', 401);
    }

    const role = normalizeRole(user.role);
    const status = normalizeStatus(user.status);

    if (!ACTIVE_ROLES.has(role)) {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'invalid_role', email: normalizedEmail, role });
      return fail(res, 'Account configuration error', 403);
    }

    if (status !== 'ACTIVE') {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'inactive', email: normalizedEmail, status, role });
      return fail(res, 'Account not active.', 403);
    }

    // 4. Maintenance Mode Check for non-admin logins
    if (role !== USER_ROLES.ADMIN) {
      const maintenanceState = await getMaintenanceStatus();
      if (maintenanceState.maintenance) {
        logger.warn('auth.login_blocked_maintenance', { operation: 'LOGIN', email: normalizedEmail, role });
        return fail(res, 'Visitor Hub is temporarily unavailable while maintenance is in progress.', 503, {
          maintenance: true,
          message: maintenanceState.message
        });
      }
    }

    // 5. Password Verification
    const okPassword = await bcrypt.compare(password, user.password_hash);
    if (!okPassword) {
      logger.warn('auth.login_failed', { operation: 'LOGIN', reason: 'bad_password', email: normalizedEmail });
      const failedCount = recordFailedAttempt(req.ip, normalizedEmail);
      if (failedCount >= 6) {
        res.setHeader('Retry-After', '30');
        return fail(res, 'Too many sign-in attempts. Please wait a moment before trying again.', 429, { retryAfter: 30 });
      }
      return fail(res, 'Unable to sign in with those credentials.', 401);
    }

    // 6. SUCCESSFUL AUTHENTICATION -> Immediately reset attempts counter for (IP, email)
    resetAttempts(req.ip, normalizedEmail);

    const token = jwt.sign(
      { userId: user.id, id: user.id, role, email: user.email, status, full_name: user.full_name },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    logger.info('auth.login_success', { operation: 'LOGIN', userId: user.id, email: user.email, role });
    await recordAuditEvent({
      userId: user.id,
      eventType: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
      details: { email: user.email, role },
      ipAddress: req.ip
    });

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
    await recordAuditEvent({
      userId: req.user.id,
      eventType: 'auth.logout',
      resourceType: 'user',
      resourceId: req.user.id,
      details: { email: req.user.email, role: req.user.role },
      ipAddress: req.ip
    });
    
    return ok(res, { message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
});

export default router;
