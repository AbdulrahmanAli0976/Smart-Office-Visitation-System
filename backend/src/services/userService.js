import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { sanitizeLike } from '../utils/validators.js';

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
    const filters = ["role = 'OFFICER'"];
    const params = [];

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
    const sql = `SELECT SQL_CALC_FOUND_ROWS id, full_name, email, role, status, created_at, updated_at
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await conn.execute(sql, params);
    const [totals] = await conn.execute('SELECT FOUND_ROWS() as total');
    const total = totals[0]?.total ?? 0;
    return { rows, total };
  } finally {
    conn.release();
  }
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
