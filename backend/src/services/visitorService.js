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

export async function updateVisitor(id, { fullName, phoneNumber, visitorType, code }) {
  const result = await db.query(
    `UPDATE visitors
     SET full_name = ?, phone_number = ?, visitor_type = ?, code = ?, updated_at = NOW()
     WHERE id = ?`,
    [fullName, normalizePhone(phoneNumber), visitorType, code || null, id]
  );
  return result.affectedRows;
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

  const normalizedPhone = normalizePhone(q);
  const phoneLike = `%${sanitizeLike(normalizedPhone)}%`;
  const nameLike = `%${sanitizeLike(q)}%`;

  return db.query(
    `SELECT id, full_name, phone_number, visitor_type, code,
            CASE
              WHEN code = ? THEN 0
              WHEN phone_number = ? THEN 1
              WHEN phone_number LIKE ? THEN 2
              WHEN full_name LIKE ? THEN 3
              ELSE 4
            END AS priority
     FROM visitors
     WHERE code = ? OR phone_number = ? OR phone_number LIKE ? OR full_name LIKE ?
     ORDER BY priority ASC, full_name ASC
     LIMIT ?`,
    [q, normalizedPhone, phoneLike, nameLike, q, normalizedPhone, phoneLike, nameLike, limit]
  );
}

export async function findDuplicates({ fullName, phoneNumber, excludeId = null }) {
  const phone = normalizePhone(phoneNumber);
  const nameLike = `%${sanitizeLike(fullName)}%`;
  const params = [phone, nameLike, fullName];
  const excludeSql = excludeId ? ' AND id <> ?' : '';
  if (excludeId) params.push(excludeId);

  return db.query(
    `SELECT id, full_name, phone_number, visitor_type, code
     FROM visitors
     WHERE (phone_number = ?
        OR full_name LIKE ?
        OR SOUNDEX(full_name) = SOUNDEX(?))${excludeSql}
     ORDER BY full_name ASC
     LIMIT 10`,
    params
  );
}
