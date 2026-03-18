import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

export async function createOfficer({ fullName, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, 'OFFICER', 'PENDING')`,
    [fullName, email, passwordHash]
  );
  return result.insertId;
}

export async function createAdmin({ fullName, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
    [fullName, email, passwordHash]
  );
  return result.insertId;
}

export async function findUserByEmail(email) {
  const rows = await db.query(
    'SELECT id, full_name, email, password_hash, role, status FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

export async function listOfficers() {
  return db.query(
    `SELECT id, full_name, email, role, status, created_at, updated_at
     FROM users
     WHERE role = 'OFFICER'
     ORDER BY created_at DESC`
  );
}

export async function updateOfficerStatus(id, status) {
  const result = await db.query(
    'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND role = "OFFICER"',
    [status, id]
  );
  return result.affectedRows;
}

export async function deleteOfficer(id) {
  const result = await db.query(
    'DELETE FROM users WHERE id = ? AND role = "OFFICER"',
    [id]
  );
  return result.affectedRows;
}
