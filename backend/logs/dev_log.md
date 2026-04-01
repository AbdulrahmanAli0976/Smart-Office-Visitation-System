# Development Log

This log captures development actions and integrity checks performed on the system.

## 2026-03-18 11:03:10 +01:00
- Added backend logging directory and dev log file.
- Added `backend/scripts/integrity-check.js` for DB + API health verification.
- Installed backend dependencies with `npm install`.
- Integrity check: API health OK; DB connection FAILED (ECONNREFUSED). Likely MySQL not running or DB not created yet.
- Next: start MySQL, ensure `visitor_management` database exists, then rerun integrity check.

## 2026-03-18 11:04:04 +01:00
- Initialized git repo and staged all files.
- Initial commit failed due to missing git user.name and user.email configuration.
- Integrity check still failing on DB connection (ECONNREFUSED). API health OK.
- Next: configure git identity, start MySQL / create DB, rerun integrity check.

## 2026-03-18 11:09:15 +01:00
- Configured local git identity (user.name/user.email).
- Created initial commit: "chore: initial project setup".
- Added remote origin: https://github.com/AbdulrahmanAli0976/Smart-Office-Visitation-System
- Phase 2 integrity check still blocked by DB connection error (ECONNREFUSED).

## 2026-03-18 11:43:59 +01:00
- Created MySQL database `visitor_management` and imported schema from `database/schema.sql`.
- Updated `backend/scripts/integrity-check.js` to close DB pool so the script exits cleanly.
- Integrity check result: DB OK, API /api/health OK.

## 2026-03-18 12:16:36 +01:00
- Phase 3 backend updates: added active-officer enforcement for check-in/check-out.
- Added visitor update endpoint and service, plus duplicate detection support for updates.
- Enhanced auth middleware to verify officer status against the DB on check-in/check-out.

## 2026-03-18 12:26:26 +01:00
- Ran integrity check: DB OK, API health OK.
- Verified INACTIVE officer enforcement: check-in blocked with 403.
- Removed temporary verification script `backend/scripts/inactive-officer-check.js`.

## 2026-03-18 12:41:04 +01:00
- Added analytics summary endpoint `/api/reports/summary` with optional date range.
- Added frontend analytics panel and toggle (today vs all-time).
- Added inline UI validation for search and check-in fields.

## 2026-03-18 12:54:25 +01:00
- Standardized API responses to `{ success, data }` / `{ success, error }` across backend routes and middleware.
- Updated frontend API client to consume standardized responses.
- Added Phase 4 functional + edge test script `backend/scripts/phase4-tests.js`.
- Ran integrity check: DB OK, API health OK.
- Ran Phase 4 tests: all PASS.

## 2026-03-18 13:10:47 +01:00
- Phase 5: added transactional check-in (`createVisitAtomic`) to prevent race conditions and duplicate ACTIVE visits.
- Improved visitor search ranking (exact phone match prioritized over partial).
- Added index `idx_visits_visitor_status` on visits for faster active-visit checks.
- UI polish: active visitors show officer + type, search auto-focus, quick select from search results.
- Added ErrorBoundary to prevent UI crashes.
- Integrity check and Phase 4 test suite re-run: all PASS.

## 2026-03-18 13:36:35 +01:00
- Phase 6: added analytics endpoints (dashboard metrics, visitors per day, visitor type distribution).
- Added visit history and visitor history endpoints with filters + CSV export.
- Implemented soft delete columns + indexes for visitors and visits; updated queries to ignore deleted records.
- UI: added dashboard metrics, analytics charts, visit history panel, visitor history viewer, and CSV export.
- Added auto-refresh for active visitors and improved session-expired handling.
- Integrity + Phase 4 tests re-run: all PASS.

## 2026-03-18 15:01:52 +01:00
- Phase 7: added env layering for dev/staging/prod with new .env example files and stricter production JWT secret check.
- Added rate limiting (express-rate-limit) and file-based logging (app/error logs).
- Added analytics metrics, history, visitor history, and CSV export endpoints + UI dashboards.
- Implemented soft delete schema + indexes for visitors and visits (updated SQL + DB).
- Added ops files for PM2, Nginx, and backup/restore scripts; added DEPLOYMENT.md.
- Added Phase 7 test script; integrity check re-run after changes.

## 2026-03-18 15:03:33 +01:00
- Ran integrity check: DB OK, API health OK.
- Ran Phase 7 tests: all PASS (dashboard metrics, analytics, history, export).

## 2026-03-18 20:34:48 +01:00
- Added PROJECT_STATUS.md with phase completion summary and deployment readiness.

## 2026-03-18 20:42:07 +01:00
- Updated PROJECT_STATUS.md with user-provided Phase 7 completion summary and Phase 8 note.


## 2026-03-22 10:00:00 +01:00
- **Admin Fix:** Resolved issue where admins could not check-in/out. Updated \uth.middleware\ to correctly prioritize admin role without unnecessary DB lookups.
- **Bulk Operations:** Fixed bulk check-in/out logic. Added transactional support and detailed success/failure logging.
- **Data Integrity:** Added unique constraint on \phone_number\ in \isitors\ table. Updated \isitService\ to use \SELECT ... FOR UPDATE\ to prevent race conditions.
- **System Hardening:**
  - Implemented structured JSON logging in \ackend/src/utils/logger.js\.
  - Added rate limiting to login route.
  - Implemented fail-fast configuration validation in \ackend/src/config/env.js\.
  - Hardened error handling to hide stack traces in production.
- **System Survival:**
  - Updated \docker-compose.yml\ with \estart: unless-stopped\ for all services.
  - Implemented graceful shutdown handling for SIGTERM/SIGINT in \ackend/src/server.js\.
  - Upgraded \/health\ endpoint to perform real DB connectivity checks.


## 2026-03-26 – Production Hardening Updates
- Added centralized phone normalization utility: ackend/src/utils/normalizePhone.js (deterministic +234 normalization).
- Removed 
ormalizePhone from ackend/src/utils/validators.js and updated imports across services/routes.
- Enforced phone normalization + invalid-phone guards before DB insert/update/search.
- Updated visit/visitor services to use normalized phones for lookups and to skip invalid phone rows in bulk check-in.
- Added log context injection and standardized log fields (requestId, route, userId).
- Sentry integration completed: init, request context, user context, and error handler ordering.
- Trust proxy hardened and rate limit key generator updated to user-aware keys.
- Error handler route fallback to eq.safeRoute || req.originalUrl.


## 2026-03-26 – Blocking Fixes Before Validation
- Moved requestId middleware to the top of ackend/src/app.js to ensure JSON parse errors get requestId/route.
- Verified admin user exists (ADMIN/ACTIVE) and password hash matches; login now returns 200 + token.
- Created missing 	oken_blacklist table in live DB (token verification no longer fails after login).
- Verified requestId now appears on error logs for JSON parse errors.

\n## 2026-03-27 Progress\n- Implemented normalizePhone utility in backend/src/utils/normalizePhone.js; removed duplicate in validators; updated imports in visitor/visit services and routes.\n- Hardened visitorService: strict phone normalization, early validation, dedup by normalized phone, strict phone-only search when input is phone.\n- Updated visitService: active visit checks require time_out IS NULL; bulkCheckIn rolls back on active visit conflict and flags summary.conflict.\n- Updated visits.routes.js single check-in conflict message: 'Visitor already checked in' (409). Pending: ensure bulk conflict returns 409 with same message.\n- Reports dashboard now admin-only via requireRole('ADMIN').\n- RequestId middleware moved to top of app.js; safeRoute set; AsyncLocalStorage context used in logger; error handler uses req.safeRoute || req.originalUrl; Sentry initialized.\n- DB: token_blacklist table created with indexes.\n- Frontend: DashboardMetrics now hides pending officers unless isAdmin; App.jsx needs cleanup (remove literal \\n artifacts) and ensure refreshDashboard guard prevents non-admin calls.\n- Validation not yet run per blocker: must fix App.jsx + bulk conflict before runtime tests.\n
\n## 2026-03-27 Logout Stability Fixes\n- Added global logout guard in frontend/src/api.js: isLoggingOut flag + setLoggingOut export; block requests during logout; 401 triggers auth logout event; blocked requests marked as auth-safe.\n- Updated frontend/src/App.jsx: logout now sets logging out flag, clears storage/state, navigates to /login, resets flag after 1s; ProtectedRoute enforced; handleAuthFailure ignores blocked/auth errors; login clears logging flag; auth event listener wired.\n- Added per-page token/user guards and request aborts to prevent API calls post-logout: frontend/src/pages/DashboardPage.jsx, VisitsPage.jsx, ReportsPage.jsx, AdminPage.jsx.\n- ErrorBoundary ignores auth errors (401/403 or isAuthError).\n
## 2026-03-29 10:05:00 +01:00
- Forensic logout trace instrumentation added: global error/unhandled promise handlers in frontend/src/main.jsx; API request/response/error tracing in frontend/src/api.js; logout trace + protected route trace in frontend/src/App.jsx; mount/unmount tracing in dashboard/visitors/visits/reports pages.
- Rebuilt frontend container to include instrumentation.
- Collected frontend runtime error: React error #31 (SyntheticEvent object rendered) during logout.
- Fixed logout event leak: Logout button now calls onLogout via lambda in frontend/src/components/Sidebar.jsx; logout handler sanitizes object notes and uses safe message in frontend/src/App.jsx.
- Verified by user: logout error resolved.
- Cleaned instrumentation: removed temporary console.log traces (API_REQUEST_START/RESPONSE, LOGOUT_CLICKED, MOUNT/UNMOUNT, protected route logs) while keeping global error handlers and console.error.

## 2026-03-29 10:35:00 +01:00
- UX feedback system implemented:
  - Visitors search debounced (400ms) and empty-state messaging updated with styled guidance.
  - Visits search debounced (400ms) and empty-state messaging updated with styled guidance.
  - Added toast errors for validation + auth guard failures in Visitors/Visits.
  - Added toast success for visit check-in/out, bulk check-in, visitor history load, and admin actions (approve/deactivate/delete).
  - Added styled empty state for admin officers list.
- Fixed accidental literal "\\n" artifacts in modified JSX files.
- Rebuilt frontend container; initial build failed due to stray "\\n" token in frontend/src/api.js, then fixed and rebuild succeeded.

## 2026-03-29 10:55:00 +01:00
- System state awareness layer added:
  - API failure tracking in frontend/src/api.js with system:error / system:clear events after repeated failures.
  - Global banner in frontend/src/App.jsx for offline state and server-unreachable errors.
  - Offline detection via online/offline events.
  - Session-expired message standardized to "Session expired. Please login again." before redirect.
  - Added confirmation dialog for destructive admin actions (deactivate/delete).
- Created .env.development and .env.production with placeholder production secrets and safe defaults.
