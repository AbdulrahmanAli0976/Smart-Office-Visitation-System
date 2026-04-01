import { db } from '../config/db.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import { sanitizeLike } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

export async function createVisit({ visitorId, officerId, purpose, personToSee }) {
  const result = await db.query(
    `INSERT INTO visits (visitor_id, officer_id, purpose, person_to_see, time_in, status)
     VALUES (?, ?, ?, ?, NOW(), 'ACTIVE')`,
    [visitorId, officerId, purpose, personToSee]
  );
  return result.insertId;
}

export async function createVisitAtomic({ visitorId, officerId, purpose, personToSee }) {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock visitor row to prevent concurrent visits for the same identity
    const [visitorRows] = await conn.execute(
      `SELECT id FROM visitors WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [visitorId]
    );

    if (visitorRows.length === 0) {
      await conn.rollback();
      return { error: 'Visitor not found' };
    }

    // Check for existing active visit
    const [activeRows] = await conn.execute(
      `SELECT id FROM visits WHERE visitor_id = ? AND status = 'ACTIVE' AND time_out IS NULL AND deleted_at IS NULL FOR UPDATE`,
      [visitorId]
    );

    if (activeRows.length > 0) {
      // Idempotency: If same officer and purpose, treat as success (or just return conflict)
      await conn.rollback();
      return { conflict: true, visitId: activeRows[0].id };
    }

    const [result] = await conn.execute(
      `INSERT INTO visits (visitor_id, officer_id, purpose, person_to_see, time_in, status)
       VALUES (?, ?, ?, ?, NOW(), 'ACTIVE')`,
      [visitorId, officerId, purpose, personToSee]
    );

    await conn.commit();
    return { success: true, visitId: result.insertId };
  } catch (err) {
    try { await conn.rollback(); } catch (_) { }
    throw err;
  } finally {
    conn.release();
  }
}

export async function bulkCheckIn({ officerId, visitors, purpose, personToSee }) {
  const conn = await db.pool.getConnection();
  const summary = { created: 0, reused: 0, failed: 0 };

  try {
    await conn.beginTransaction();

    for (const visitor of visitors) {
      try {
        const fullName = visitor.full_name.trim();
        const phone = normalizePhone(visitor.phone_number || visitor.phone);
        const visitorType = visitor.visitor_type;
        const code = visitor.code ? visitor.code.trim() : null;

        let visitorId = null;
        let isNewVisitor = false;

        // 1. Lock/Find Visitor
        const [existing] = await conn.execute(
          `SELECT id FROM visitors WHERE phone_number = ? AND deleted_at IS NULL FOR UPDATE`,
          [phone]
        );

        if (existing.length > 0) {
          visitorId = existing[0].id;
        } else {
          try {
            const [insert] = await conn.execute(
              `INSERT INTO visitors (full_name, phone_number, visitor_type, code)
               VALUES (?, ?, ?, ?)`,
              [fullName, phone, visitorType, code || null]
            );
            visitorId = insert.insertId;
            isNewVisitor = true;
          } catch (insErr) {
            if (insErr.code === 'ER_DUP_ENTRY') {
              const [retry] = await conn.execute(
                `SELECT id FROM visitors WHERE phone_number = ? AND deleted_at IS NULL FOR UPDATE`,
                [phone]
              );
              visitorId = retry[0]?.id;
            } else { throw insErr; }
          }
        }

        if (!visitorId) {
          summary.failed += 1;
          continue;
        }

        // 2. Lock/Check Active Visit
        const [active] = await conn.execute(
          `SELECT id FROM visits WHERE visitor_id = ? AND status = 'ACTIVE' AND time_out IS NULL AND deleted_at IS NULL FOR UPDATE`,
          [visitorId]
        );

        if (active.length > 0) {
          await conn.rollback();
          return { conflict: true };
        }

        // 3. Create Visit
        await conn.execute(
          `INSERT INTO visits (visitor_id, officer_id, purpose, person_to_see, time_in, status)
           VALUES (?, ?, ?, ?, NOW(), 'ACTIVE')`,
          [visitorId, officerId, purpose, personToSee]
        );

        if (isNewVisitor) summary.created += 1;
        else summary.reused += 1;

      } catch (rowErr) {
        logger.error('visits.bulk_checkin_row_failed', { error: rowErr.message, visitor });
        summary.failed += 1;
      }
    }

    await conn.commit();
    return summary;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { }
    throw err;
  } finally {
    conn.release();
  }
}

export async function bulkCheckOut({ visitIds }) {
  if (!visitIds.length) return 0;
  const placeholders = visitIds.map(() => '?').join(',');
  const result = await db.query(
    `UPDATE visits
     SET status = 'COMPLETED', time_out = NOW(), updated_at = NOW()
     WHERE id IN (${placeholders}) AND status = 'ACTIVE' AND deleted_at IS NULL AND (time_out IS NULL) AND time_in <= NOW()`,
    visitIds
  );
  return result.affectedRows;
}


export async function completeVisit(visitId) {
  const result = await db.query(
    `UPDATE visits
     SET status = 'COMPLETED', time_out = NOW(), updated_at = NOW()
     WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL AND (time_out IS NULL) AND time_in <= NOW()`,
    [visitId]
  );
  return result.affectedRows;
}

export async function listActiveVisits() {
  return db.query(
    `SELECT v.id AS visit_id, v.status, v.time_in, v.time_out,
            vis.id AS visitor_id, vis.full_name, vis.phone_number, vis.visitor_type, vis.code,
            u.id AS officer_id, u.full_name AS officer_name
     FROM visits v
     JOIN visitors vis ON vis.id = v.visitor_id
     JOIN users u ON u.id = v.officer_id
     WHERE v.status = 'ACTIVE' AND v.deleted_at IS NULL AND vis.deleted_at IS NULL
     ORDER BY v.time_in DESC`
  );
}

export async function listVisitHistoryPaged({ from, to, visitorType, officerId, status, search = '', limit = 10, offset = 0 }) {
  const conn = await db.pool.getConnection();
  try {
    const filters = ['v.deleted_at IS NULL', 'vis.deleted_at IS NULL'];
    const params = [];

    if (from) {
      filters.push('v.time_in >= ?');
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      filters.push('v.time_in <= ?');
      params.push(`${to} 23:59:59`);
    }
    if (visitorType) {
      filters.push('vis.visitor_type = ?');
      params.push(visitorType);
    }
    if (officerId) {
      filters.push('v.officer_id = ?');
      params.push(officerId);
    }
    if (status) {
      filters.push('v.status = ?');
      params.push(status);
    }

    const trimmed = String(search || '').trim();
    if (trimmed) {
      const term = `%${sanitizeLike(trimmed)}%`;
      filters.push('(vis.full_name LIKE ? OR vis.phone_number LIKE ? OR vis.code LIKE ? OR u.full_name LIKE ?)');
      params.push(term, term, term, term);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `SELECT SQL_CALC_FOUND_ROWS v.id AS visit_id, v.status, v.time_in, v.time_out,
            v.purpose, v.person_to_see,
            vis.id AS visitor_id, vis.full_name, vis.phone_number, vis.visitor_type, vis.code,
            u.id AS officer_id, u.full_name AS officer_name
     FROM visits v
     JOIN visitors vis ON vis.id = v.visitor_id
     JOIN users u ON u.id = v.officer_id
     ${where}
     ORDER BY v.time_in DESC
     LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await conn.execute(sql, params);
    const [totals] = await conn.execute('SELECT FOUND_ROWS() as total');
    const total = totals[0]?.total ?? 0;
    return { rows, total };
  } finally {
    conn.release();
  }
}

export async function listVisitHistory({ from, to, visitorType, officerId }) {
  const filters = ['v.deleted_at IS NULL', 'vis.deleted_at IS NULL'];
  const params = [];

  if (from) {
    filters.push('v.time_in >= ?');
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    filters.push('v.time_in <= ?');
    params.push(`${to} 23:59:59`);
  }
  if (visitorType) {
    filters.push('vis.visitor_type = ?');
    params.push(visitorType);
  }
  if (officerId) {
    filters.push('v.officer_id = ?');
    params.push(officerId);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  return db.query(
    `SELECT v.id AS visit_id, v.status, v.time_in, v.time_out,
            v.purpose, v.person_to_see,
            vis.id AS visitor_id, vis.full_name, vis.phone_number, vis.visitor_type, vis.code,
            u.id AS officer_id, u.full_name AS officer_name
     FROM visits v
     JOIN visitors vis ON vis.id = v.visitor_id
     JOIN users u ON u.id = v.officer_id
     ${where}
     ORDER BY v.time_in DESC
     LIMIT 500`,
    params
  );
}

export async function listVisitorHistory(visitorId) {
  return db.query(
    `SELECT v.id AS visit_id, v.status, v.time_in, v.time_out,
            v.purpose, v.person_to_see,
            u.id AS officer_id, u.full_name AS officer_name
     FROM visits v
     JOIN users u ON u.id = v.officer_id
     WHERE v.visitor_id = ? AND v.deleted_at IS NULL
     ORDER BY v.time_in DESC`,
    [visitorId]
  );
}

export async function findVisitById(id) {
  const rows = await db.query(
    `SELECT id, visitor_id, officer_id, purpose, person_to_see, time_in, time_out, status
     FROM visits WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function findActiveVisitByVisitor(visitorId) {
  const rows = await db.query(
    `SELECT id, visitor_id, officer_id, status, time_in
     FROM visits
     WHERE visitor_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
     ORDER BY time_in DESC
     LIMIT 1`,
    [visitorId]
  );
  return rows[0] || null;
}



