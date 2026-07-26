-- Add additional RBAC roles and enforce a single active visit per visitor.

ALTER TABLE users
  MODIFY COLUMN role ENUM('ADMIN', 'OFFICER') NOT NULL;

ALTER TABLE visits
  ADD COLUMN is_active TINYINT(1) AS (status = 'ACTIVE') STORED AFTER status,
  ADD UNIQUE KEY ux_visits_active (visitor_id, is_active);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  event_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NULL,
  resource_id VARCHAR(100) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_event (event_type),
  INDEX idx_audit_created_at (created_at)
);
