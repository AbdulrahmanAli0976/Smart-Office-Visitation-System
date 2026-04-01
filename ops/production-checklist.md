# Production Deployment Checklist

1. Confirm `JWT_SECRET`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD` are strong and unique.
2. Set `CORS_ORIGIN` to your production domain.
3. Create `.env` from `.env.docker.example` and update values.
4. Build and start containers with `docker compose up -d --build`.
5. Verify database initialized from `database/schema.sql`.
6. Seed the initial admin user.
7. Verify `/api/health` returns `200` from the backend.
8. Validate login, visitor registration, check-in, and checkout flows.
9. Confirm logs are being written to the backend logs volume.
10. Configure HTTPS at the edge (Nginx, load balancer, or managed TLS).
11. Set up backups and test restore procedures.
12. Enable monitoring or alerting (Sentry, Datadog, ELK, or similar).
13. Normalize & dedupe visitors using `backend/scripts/dedupe-visitors.js` before running `database/migrations/20260401_add_unique_phone.sql`.
14. Deploy through `docker-compose.prod.yml` (no dev mounts) while wiring `.env.production`.
15. Apply `ops/nginx.prod.conf`, obtain TLS certs for your domain, and ensure `/api/debug/sentry-test` can trigger a Sentry entry (flip `DEBUG_ROUTES_ENABLED`).
16. Schedule backups with `ops/setup-backup-cron.sh` or `ops/setup-backup-task.ps1` and verify `ops/backup.*` / `ops/restore.*`.
