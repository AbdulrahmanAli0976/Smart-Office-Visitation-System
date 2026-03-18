import { db } from '../config/db.js';

export async function createVisit({ visitorId, officerId, purpose, personToSee }) {
  const result = await db.query(
    `INSERT INTO visits (visitor_id, officer_id, purpose, person_to_see, time_in, status)
     VALUES (?, ?, ?, ?, NOW(), 'ACTIVE')`,
    [visitorId, officerId, purpose, personToSee]
  );
  return result.insertId;
}

export async function completeVisit(visitId) {
  const result = await db.query(
    `UPDATE visits
     SET status = 'COMPLETED', time_out = NOW(), updated_at = NOW()
     WHERE id = ? AND status = 'ACTIVE'`,
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
     WHERE v.status = 'ACTIVE'
     ORDER BY v.time_in DESC`
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
     WHERE visitor_id = ? AND status = 'ACTIVE'
     ORDER BY time_in DESC
     LIMIT 1`,
    [visitorId]
  );
  return rows[0] || null;
}
