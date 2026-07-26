# API Reference

## Base URL
- Development: `http://localhost:4000/api`
- Production: use the deployed backend host and `/api`

## Auth

### POST `/api/auth/register`
- Description: Register a new officer account.
- Auth: None
- Permissions: Public
- Body:
  - `full_name` (required)
  - `email` (required)
  - `password` (required, strong password)
- Responses:
  - `201` success
  - `400` invalid payload
  - `409` email already registered

### POST `/api/auth/login`
- Description: Authenticate a user.
- Auth: None
- Permissions: Public
- Body:
  - `email`
  - `password`
- Responses:
  - `200` success with JWT
  - `400` invalid credentials payload
  - `401` invalid email/password
  - `403` inactive or invalid account configuration

### POST `/api/auth/logout`
- Description: Revoke the supplied JWT.
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`
- Responses:
  - `200` logout complete
  - `401` invalid or expired token

## Admin

### GET `/api/admin/officers`
- Description: List officers.
- Auth: Bearer token required
- Permissions: `ADMIN`
- Response: `200` with officer records and pagination metadata

### PUT `/api/admin/officers/:id/approve`
- Description: Mark an officer as active.
- Auth: Bearer token required
- Permissions: `ADMIN`

### PUT `/api/admin/officers/:id/deactivate`
- Description: Mark an officer inactive.
- Auth: Bearer token required
- Permissions: `ADMIN`

### DELETE `/api/admin/officers/:id`
- Description: Remove an officer record.
- Auth: Bearer token required
- Permissions: `ADMIN`

## Visitors

### GET `/api/visitors`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`
- Query params: `page`, `limit`, `search`, `status`, `type`

### GET `/api/visitors/search`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`
- Query: `q`

### POST `/api/visitors`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`
- Body: `full_name`, `phone_number`, `visitor_type`, `code`

### PUT `/api/visitors/:id`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/visitors/:id`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/visitors/:id/history`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

## Visits

### POST `/api/visits/checkin`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`
- Body: `query` or `visitor` record plus `purpose` and `person_to_see`

### POST `/api/visits/bulk-checkin`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### PUT `/api/visits/:id/checkout`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/visits`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/visits/active`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/visits/history`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

## Reports

### GET `/api/reports/summary`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/reports/dashboard`
- Auth: Bearer token required
- Permissions: `ADMIN`

### GET `/api/reports/visitors-per-day`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

### GET `/api/reports/visitor-types`
- Auth: Bearer token required
- Permissions: `ADMIN`, `OFFICER`

## Health

### GET `/api/health`
- Description: Readiness probe returning database status.
- Auth: None
- Permissions: Public
