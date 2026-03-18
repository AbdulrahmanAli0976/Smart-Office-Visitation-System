import { db } from '../config/db.js';

function buildRange({ from, to }, column = 'v.time_in') {
  const filters = [];
  const params = [];

  if (from) {
    filters.push(`${column} >= ?`);
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    filters.push(`${column} <= ?`);
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
     WHERE v.deleted_at IS NULL${where}`,
    params
  );

  const summary = rows[0] || {};

  const todayRows = await db.query(
    `SELECT
        SUM(DATE(v.time_in) = CURDATE()) AS checkins_today,
        SUM(DATE(v.time_out) = CURDATE()) AS checkouts_today
     FROM visits v
     WHERE v.deleted_at IS NULL`
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

export async function getDashboardMetrics() {
  const rows = await db.query(
    `SELECT
        COUNT(DISTINCT CASE WHEN DATE(v.time_in) = CURDATE() THEN v.visitor_id END) AS visitors_today,
        SUM(v.status = 'ACTIVE') AS active_visitors_now,
        SUM(CASE WHEN v.status = 'COMPLETED' AND DATE(v.time_out) = CURDATE() THEN 1 ELSE 0 END) AS completed_today
     FROM visits v
     WHERE v.deleted_at IS NULL`
  );

  const peakRows = await db.query(
    `SELECT HOUR(v.time_in) AS hour_bucket, COUNT(*) AS total
     FROM visits v
     WHERE v.deleted_at IS NULL AND DATE(v.time_in) = CURDATE()
     GROUP BY HOUR(v.time_in)
     ORDER BY total DESC, hour_bucket ASC
     LIMIT 1`
  );

  const metrics = rows[0] || {};
  const peak = peakRows[0] || null;

  return {
    visitors_today: Number(metrics.visitors_today || 0),
    active_visitors_now: Number(metrics.active_visitors_now || 0),
    completed_today: Number(metrics.completed_today || 0),
    peak_visit_hour: peak ? { hour: Number(peak.hour_bucket), visits: Number(peak.total) } : null
  };
}

export async function getVisitorsPerDay({ from, to }) {
  const { where, params } = buildRange({ from, to });

  return db.query(
    `SELECT DATE(v.time_in) AS day, COUNT(*) AS total_visits
     FROM visits v
     WHERE v.deleted_at IS NULL${where}
     GROUP BY DATE(v.time_in)
     ORDER BY day ASC`,
    params
  );
}

export async function getVisitorTypeDistribution({ from, to }) {
  const { where, params } = buildRange({ from, to });

  return db.query(
    `SELECT vis.visitor_type, COUNT(*) AS total
     FROM visits v
     JOIN visitors vis ON vis.id = v.visitor_id
     WHERE v.deleted_at IS NULL AND vis.deleted_at IS NULL${where}
     GROUP BY vis.visitor_type
     ORDER BY total DESC`,
    params
  );
}
