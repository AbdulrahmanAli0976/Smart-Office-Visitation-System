START TRANSACTION;

-- Preserve ADMIN users exactly as-is.
-- Normalize every remaining non-ADMIN legacy role to OFFICER so the final schema only supports
-- the two business roles required by the application.
UPDATE users
SET role = 'OFFICER'
WHERE role <> 'ADMIN';

-- Restrict the enum to the only supported business roles.
ALTER TABLE users
  MODIFY COLUMN role ENUM('ADMIN', 'OFFICER') NOT NULL;

COMMIT;
