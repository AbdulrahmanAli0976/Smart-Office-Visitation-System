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
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  visitor_type ENUM('BD', 'MS', 'AGG', 'AGENT_MERCHANT') NOT NULL,
  code VARCHAR(50) UNIQUE NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_visitors_phone (phone_number),
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
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visits_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id),
  CONSTRAINT fk_visits_officer FOREIGN KEY (officer_id) REFERENCES users(id),
  INDEX idx_visits_status (status),
  INDEX idx_visits_time_in (time_in),
  INDEX idx_visits_visitor_status (visitor_id, status),
  INDEX idx_visits_officer (officer_id),
  INDEX idx_visits_deleted_at (deleted_at)
);
