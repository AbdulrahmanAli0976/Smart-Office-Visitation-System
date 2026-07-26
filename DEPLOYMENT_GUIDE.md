# Deployment Guide

This guide covers production-ready deployment for the Visitor Management System.

## 1) Environment Configuration

Backend (examples in `backend/.env.*.example`):
- `NODE_ENV`, `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- `LOG_LEVEL`, `HTTP_LOG_FORMAT`

Frontend (examples in `frontend/.env.*.example`):
- `VITE_API_BASE`

Never commit real secrets. Use deployment secrets or CI/CD secrets store.

## 2) Database Preparation

- Apply latest schema in `database/schema.sql`.
- Ensure indexes exist (soft delete + history queries).
- Verify foreign keys and data integrity.

Suggested checks:
- `visitors.phone_number`, `visitors.full_name`, `visitors.code`, `visitors.deleted_at`
- `visits.status`, `visits.time_in`, `visits.officer_id`, `visits.deleted_at`

## 3) Docker Deployment (Recommended)

- Copy `.env.docker.example` to `.env` and update values.
- Build and start services: `docker compose up -d --build`.
- Frontend runs on `http://localhost:8080`.
- API runs on `http://localhost:4000`.
- Stop services: `docker compose down`.
- Data is stored in the `db_data` volume, logs in `backend_logs`.

## 4) Server Setup (Non-Docker)

Recommended:
- Node.js LTS
- Process manager (PM2) with auto-restart
- Reverse proxy (Nginx) for HTTPS

Sample PM2 config: `ops/pm2.config.cjs`
Sample Nginx config: `ops/nginx.conf.example`

## 5) Security Hardening

- Ensure JWT secrets are strong and unique per environment.
- Rate limiting is enabled via `RATE_LIMIT_*` env vars.
- CORS restricted to your domain(s).
- All queries are parameterized to prevent SQL injection.
- Passwords hashed with bcrypt.

## 6) Logging & Monitoring

- Logs written to `backend/logs/app.log` and `backend/logs/error.log`.
- Consider integrating Sentry/Datadog/ELK for centralized monitoring.

## 7) Backups & Recovery

- Use `ops/backup.ps1` (Windows) or `ops/backup.sh` (Linux) for daily backups.
- Test restoring with `ops/restore.ps1` / `ops/restore.sh`.

## 8) CI/CD

- GitHub Actions workflow lives in `.github/workflows/ci.yml`.
- Add deployment steps and secrets when ready to automate releases.

## 9) Production Checklist

- Review and follow `ops/production-checklist.md`.

## 10) Final QA Checklist

- Run `node backend/scripts/integrity-check.js`.
- Run `node backend/scripts/phase4-tests.js`.
- Verify analytics endpoints and CSV export.
- Confirm frontend UI behaviors in production build.
