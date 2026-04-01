import { db } from '../config/db.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import { sanitizeLike } from '../utils/validators.js';

export async function createVisitor({ fullName, phoneNumber, visitorType, code }) {
  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }

  const existing = await db.query(
    `SELECT id FROM visitors WHERE phone_number = ? AND deleted_at IS NULL LIMIT 1`,
    [normalizedPhone]
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const result = await db.query(
    `INSERT INTO visitors (full_name, phone_number, visitor_type, code)
     VALUES (?, ?, ?, ?)`,
    [fullName.trim(), normalizedPhone, visitorType, code ? code.trim() : null]
  );
  return result.insertId;
}

export async function findVisitorByPhone(phone, lock = false) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  const lockSql = lock ? ' FOR UPDATE' : '';
  const rows = await db.query(
    `SELECT id, full_name, phone_number, visitor_type, code, created_at, updated_at 
     FROM visitors 
     WHERE phone_number = ? AND deleted_at IS NULL${lockSql} LIMIT 1`,
    [normalizedPhone]
  );
  return rows[0] || null;
}

export async function updateVisitor(id, { fullName, phoneNumber, visitorType, code }) {
  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }
  const result = await db.query(
    `UPDATE visitors
     SET full_name = ?, phone_number = ?, visitor_type = ?, code = ?, updated_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [fullName.trim(), normalizedPhone, visitorType, code ? code.trim() : null, id]
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
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 50));

  if (normalizedPhone) {
    return db.query(
      `SELECT id, full_name, phone_number, visitor_type, code
       FROM visitors
       WHERE deleted_at IS NULL AND phone_number = ?
       ORDER BY full_name ASC
       LIMIT ${safeLimit}`,
      [normalizedPhone]
    );
  }

  const nameLike = `%${sanitizeLike(q)}%`;
  return db.query(
    `SELECT id, full_name, phone_number, visitor_type, code
     FROM visitors
     WHERE deleted_at IS NULL AND (full_name LIKE ? OR code LIKE ?)
     ORDER BY full_name ASC
     LIMIT ${safeLimit}`,
    [nameLike, nameLike]
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
  const phone = normalizePhone(phoneNumber) || null;
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


