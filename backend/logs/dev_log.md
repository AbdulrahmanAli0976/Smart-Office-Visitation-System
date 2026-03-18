# Development Log

This log captures development actions and integrity checks performed on the system.

## 2026-03-18 11:03:10 +01:00
- Added backend logging directory and dev log file.
- Added `backend/scripts/integrity-check.js` for DB + API health verification.
- Installed backend dependencies with `npm install`.
- Integrity check: API health OK; DB connection FAILED (ECONNREFUSED). Likely MySQL not running or DB not created yet.
- Next: start MySQL, ensure `visitor_management` database exists, then rerun integrity check.

