import { db } from '../config/db.js';

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

    const [activeRows] = await conn.execute(
      `SELECT id
       FROM visits
       WHERE visitor_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
       FOR UPDATE`,
      [visitorId]
    );

    if (activeRows.length > 0) {
      await conn.rollback();
      return { conflict: true, visitId: activeRows[0].id };
    }

    const [result] = await conn.execute(
      `INSERT INTO visits (visitor_id, officer_id, purpose, person_to_see, time_in, status)
       VALUES (?, ?, ?, ?, NOW(), 'ACTIVE')`,
      [visitorId, officerId, purpose, personToSee]
    );

    await conn.commit();
    return { visitId: result.insertId };
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    conn.release();
  }
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
