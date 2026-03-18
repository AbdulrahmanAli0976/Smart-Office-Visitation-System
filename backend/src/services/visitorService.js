import { db } from '../config/db.js';
import { normalizePhone, sanitizeLike } from '../utils/validators.js';

export async function createVisitor({ fullName, phoneNumber, visitorType, code }) {
  const result = await db.query(
    `INSERT INTO visitors (full_name, phone_number, visitor_type, code)
     VALUES (?, ?, ?, ?)`,
    [fullName, normalizePhone(phoneNumber), visitorType, code || null]
  );
  return result.insertId;
}

export async function findVisitorById(id) {
  const rows = await db.query(
    'SELECT id, full_name, phone_number, visitor_type, code, created_at, updated_at FROM visitors WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function searchVisitors(query, limit = 20) {
  const q = String(query || '').trim();
  if (!q) return [];

  const phoneLike = `%${sanitizeLike(normalizePhone(q))}%`;
  const nameLike = `%${sanitizeLike(q)}%`;

  return db.query(
    `SELECT id, full_name, phone_number, visitor_type, code,
            CASE
              WHEN code = ? THEN 0
              WHEN phone_number LIKE ? THEN 1
              WHEN full_name LIKE ? THEN 2
              ELSE 3
            END AS priority
     FROM visitors
     WHERE code = ? OR phone_number LIKE ? OR full_name LIKE ?
     ORDER BY priority ASC, full_name ASC
     LIMIT ?`,
    [q, phoneLike, nameLike, q, phoneLike, nameLike, limit]
  );
}

export async function findDuplicates({ fullName, phoneNumber }) {
  const phone = normalizePhone(phoneNumber);
  const nameLike = `%${sanitizeLike(fullName)}%`;

  return db.query(
    `SELECT id, full_name, phone_number, visitor_type, code
     FROM visitors
     WHERE phone_number = ?
        OR full_name LIKE ?
        OR SOUNDEX(full_name) = SOUNDEX(?)
     ORDER BY full_name ASC
     LIMIT 10`,
    [phone, nameLike, fullName]
  );
}
