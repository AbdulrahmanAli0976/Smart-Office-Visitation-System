# Final Deployment Validation

1. **Authentication health**
   - Log in via `/api/auth/login` with an ACTIVE officer/admin user; expect `200` plus token. Track the `token` + `user` payload.
2. **Visitor creation**
   - POST `/api/visitors` with a fresh phone number (normalized); expect `201` and the saved visitor data.
3. **Duplicate phone rejection**
   - Reuse the same phone in another POST `/api/visitors`; expect `409` with a clear message and no new visitor entry.
4. **Visit lifecycle**
   - POST `/api/visits/checkin` with the existing visitor; expect `201` and `duplicates` array empty.
   - POST `/api/visits/checkin` again to trigger active visit guard (should return `409`).
   - PUT `/api/visits/{visitId}/checkout` to close the visit; expect `200` and `status: COMPLETED`.
5. **Logout and token cleanup**
   - POST `/api/auth/logout` using the active token; subsequent requests with that token must return `401`.
   - Call `/api/debug/sentry-test` with `DEBUG_ROUTES_ENABLED=true` to trigger a known error; verify Sentry receives a trace with `requestId` + `userId` (check Sentry UI).
6. **Token expiry simulation**
   - Issue a token with a short TTL (e.g., override `JWT_EXPIRES_IN=1s`) or wait the configured expiry; attempt a request after expiration and expect `401 Invalid or expired token`.
7. **Backend failure handling**
   - Stop the backend container or block its port; refresh the frontend, verify the offline banner/system state shows and API errors are tracked.

Document any unexpected behavior for follow-up and re-run these steps after TLS/backups/monitoring are live.
