import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createOfficer, findUserByEmail } from '../services/userService.js';
import { isEmail, isNonEmptyString } from '../utils/validators.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body || {};

    if (!isNonEmptyString(full_name) || !isEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Invalid registration data' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = await createOfficer({ fullName: full_name.trim(), email: email.trim(), password });
    return res.status(201).json({
      id,
      status: 'PENDING',
      message: 'Registration submitted. Await admin approval.'
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!isEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const user = await findUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account not active. Await approval or contact admin.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    return res.json({
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
