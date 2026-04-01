-- Run backend/scripts/dedupe-visitors.js before applying this migration to normalize phones and merge duplicates.
ALTER TABLE visitors
  DROP INDEX idx_visitors_phone,
  ADD UNIQUE INDEX ux_visitors_phone (phone_number);
