import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { sanitizeLike } from '../utils/validators.js';
import { USER_ROLES } from '../config/roles.js';

export async function createOfficer({ fullName, email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [fullName, normalizedEmail, passwordHash, USER_ROLES.OFFICER]
  );
  return result.insertId;
}

export async function createAdmin({ fullName, email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'ACTIVE')`,
    [fullName, normalizedEmail, passwordHash, USER_ROLES.ADMIN]
  );
  return result.insertId;
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const rows = await db.query(
    'SELECT id, full_name, email, password_hash, role, status FROM users WHERE email = ?',
    [normalizedEmail]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const rows = await db.query(
    'SELECT id, full_name, email, role, status FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function listOfficersPaged({ search = '', status = '', limit = 10, offset = 0 }) {
  const conn = await db.pool.getConnection();
  try {
    const filters = ['role = ?'];
    const params = [USER_ROLES.OFFICER];

    const trimmed = String(search || '').trim();
    if (trimmed) {
      const term = `%${sanitizeLike(trimmed)}%`;
      filters.push('(full_name LIKE ? OR email LIKE ?)');
      params.push(term, term);
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus) {
      filters.push('status = ?');
      params.push(normalizedStatus);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT id, full_name, email, role, status, created_at, updated_at
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`;

    const countSql = `SELECT COUNT(*) as total FROM users ${where}`;

    const [rows] = await conn.query(sql, [...params, parseInt(limit, 10), parseInt(offset, 10)]);
    const [countRows] = await conn.execute(countSql, params);
    const total = countRows[0]?.total ?? 0;
    return { rows, total };
  } finally {
    conn.release();
  }
}

export async function listOfficers() {
  return db.query(
    `SELECT id, full_name, email, role, status, created_at, updated_at
     FROM users
     WHERE role = ?
     ORDER BY created_at DESC`,
    [USER_ROLES.OFFICER]
  );
}

export async function updateOfficerStatus(id, status) {
  const result = await db.query(
    `UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND role = ?`,
    [status, id, USER_ROLES.OFFICER]
  );
  return result.affectedRows;
}

export async function deleteOfficer(id) {
  const result = await db.query(
    `DELETE FROM users WHERE id = ? AND role = ?`,
    [id, USER_ROLES.OFFICER]
  );
  return result.affectedRows;
}
