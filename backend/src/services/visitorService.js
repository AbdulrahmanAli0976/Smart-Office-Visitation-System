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
     WHERE id = ? AND deleted_at IS NULL`,
    [fullName, normalizePhone(phoneNumber), visitorType, code || null, id]
  );
  return result.affectedRows;
}

export async function findVisitorById(id) {
  const rows = await db.query(
    'SELECT id, full_name, phone_number, visitor_type, code, created_at, updated_at FROM visitors WHERE id = ? AND deleted_at IS NULL',
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

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 50));

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
     WHERE deleted_at IS NULL
       AND (code = ? OR phone_number = ? OR phone_number LIKE ? OR full_name LIKE ?)
     ORDER BY priority ASC, full_name ASC
     LIMIT ${safeLimit}`,
    [q, normalizedPhone, phoneLike, nameLike, q, normalizedPhone, phoneLike, nameLike]
  );
}

export async function listVisitorsPaged({ search = '', status = 'ACTIVE', visitorType = null, limit = 10, offset = 0 }) {
  const conn = await db.pool.getConnection();
  try {
    const filters = [];
    const params = [];

    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (!normalizedStatus || normalizedStatus === 'ACTIVE') {
      filters.push('deleted_at IS NULL');
    } else if (normalizedStatus === 'DELETED') {
      filters.push('deleted_at IS NOT NULL');
    }

    if (visitorType) {
      filters.push('visitor_type = ?');
      params.push(visitorType);
    }

    const trimmed = String(search || '').trim();
    if (trimmed) {
      const term = `%${sanitizeLike(trimmed)}%`;
      filters.push('(full_name LIKE ? OR phone_number LIKE ? OR code LIKE ?)');
      params.push(term, term, term);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT SQL_CALC_FOUND_ROWS id, full_name, phone_number, visitor_type, code, deleted_at, created_at, updated_at
     FROM visitors
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

export async function findDuplicates({ fullName, phoneNumber, excludeId = null }) {
  const phone = normalizePhone(phoneNumber);
  const nameLike = `%${sanitizeLike(fullName)}%`;
  const params = [phone, nameLike, fullName];
  const excludeSql = excludeId ? ' AND id <> ?' : '';
  if (excludeId) params.push(excludeId);

  return db.query(
    `SELECT id, full_name, phone_number, visitor_type, code
     FROM visitors
     WHERE deleted_at IS NULL
       AND (phone_number = ?
        OR full_name LIKE ?
        OR SOUNDEX(full_name) = SOUNDEX(?))${excludeSql}
     ORDER BY full_name ASC
     LIMIT 10`,
    params
  );
}
