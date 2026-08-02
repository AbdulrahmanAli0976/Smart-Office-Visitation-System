CREATE DATABASE IF NOT EXISTS visitor_management;
USE visitor_management;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'OFFICER') NOT NULL,
  status ENUM('PENDING', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_status (role, status)
);

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  visitor_type ENUM('BD', 'MS', 'AGG', 'AGENT_MERCHANT') NOT NULL,
  code VARCHAR(50) NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  active_phone VARCHAR(30) AS (IF(deleted_at IS NULL, phone_number, NULL)) STORED,
  active_code VARCHAR(50) AS (IF(deleted_at IS NULL, code, NULL)) STORED,
  UNIQUE KEY ux_visitors_active_phone (active_phone),
  UNIQUE KEY ux_visitors_active_code (active_code),
  INDEX idx_visitors_name (full_name),
  INDEX idx_visitors_type (visitor_type),
  INDEX idx_visitors_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id INT NOT NULL,
  officer_id INT NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  person_to_see VARCHAR(120) NOT NULL,
  time_in DATETIME NOT NULL,
  time_out DATETIME NULL,
  status ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  is_active TINYINT(1) AS (IF(status = 'ACTIVE', 1, NULL)) STORED,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visits_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id),
  CONSTRAINT fk_visits_officer FOREIGN KEY (officer_id) REFERENCES users(id),
  INDEX idx_visits_status (status),
  INDEX idx_visits_time_in (time_in),
  INDEX idx_visits_visitor_status (visitor_id, status),
  UNIQUE KEY ux_visits_active (visitor_id, is_active),
  INDEX idx_visits_officer (officer_id),
  INDEX idx_visits_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(512) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blacklist_token (token(191)),
  INDEX idx_blacklist_expires (expires_at)
);

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
