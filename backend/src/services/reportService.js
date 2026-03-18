import { db } from '../config/db.js';

function buildRange({ from, to }) {
  const filters = [];
  const params = [];

  if (from) {
    filters.push('v.time_in >= ?');
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    filters.push('v.time_in <= ?');
    params.push(`${to} 23:59:59`);
  }

  const where = filters.length ? ` AND ${filters.join(' AND ')}` : '';
  return { where, params };
}

export async function getSummary({ from, to }) {
  const { where, params } = buildRange({ from, to });

  const rows = await db.query(
    `SELECT
        COUNT(*) AS total_visits,
        SUM(v.status = 'ACTIVE') AS active_visits,
        SUM(v.status = 'COMPLETED') AS completed_visits,
        COUNT(DISTINCT v.visitor_id) AS unique_visitors,
        ROUND(AVG(CASE WHEN v.status = 'COMPLETED' AND v.time_out IS NOT NULL
          THEN TIMESTAMPDIFF(MINUTE, v.time_in, v.time_out) END)) AS avg_duration_minutes
     FROM visits v
     WHERE 1=1${where}`,
    params
  );

  const summary = rows[0] || {};

  const todayRows = await db.query(
    `SELECT
        SUM(DATE(v.time_in) = CURDATE()) AS checkins_today,
        SUM(DATE(v.time_out) = CURDATE()) AS checkouts_today
     FROM visits v`
  );

  const today = todayRows[0] || {};

  return {
    total_visits: Number(summary.total_visits || 0),
    active_visits: Number(summary.active_visits || 0),
    completed_visits: Number(summary.completed_visits || 0),
    unique_visitors: Number(summary.unique_visitors || 0),
    avg_duration_minutes: summary.avg_duration_minutes === null ? null : Number(summary.avg_duration_minutes),
    checkins_today: Number(today.checkins_today || 0),
    checkouts_today: Number(today.checkouts_today || 0)
  };
}
