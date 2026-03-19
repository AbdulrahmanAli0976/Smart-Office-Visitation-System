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
