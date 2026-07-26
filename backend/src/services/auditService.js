import { db } from '../config/db.js';

export async function recordAuditEvent({
  userId = null,
  eventType,
  resourceType = null,
  resourceId = null,
  details = null,
  ipAddress = null
}) {
  await db.query(
    `INSERT INTO audit_logs (user_id, event_type, resource_type, resource_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      eventType,
      resourceType,
      resourceId != null ? String(resourceId) : null,
      details ? JSON.stringify(details) : null,
      ipAddress
    ]
  );
}
