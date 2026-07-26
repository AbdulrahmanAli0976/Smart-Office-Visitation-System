# Database Design

## Core Tables

### `users`
- `id` primary key
- `full_name`
- `email` unique
- `password_hash`
- `role` enum: `ADMIN`, `OFFICER`
- `status` enum: `PENDING`, `ACTIVE`, `INACTIVE`

### `visitors`
- `id` primary key
- `full_name`
- `phone_number` unique
- `visitor_type`
- `code` nullable unique
- `deleted_at`

### `visits`
- `id` primary key
- `visitor_id` FK -> `visitors.id`
- `officer_id` FK -> `users.id`
- `purpose`
- `person_to_see`
- `time_in`
- `time_out`
- `status` enum: `ACTIVE`, `COMPLETED`
- `is_active` generated stored column
- `deleted_at`

### `token_blacklist`
- Stores revoked JWTs by token hash or token string with expiry timestamps.

### `audit_logs`
- Stores audit trail records for auth, visitor, visit, and admin actions.

## Constraints and Indexes
- Unique index on `users.email`
- Unique index on `visitors.phone_number`
- Unique index on `visitors.code`
- Unique active-visit guard on `(visitor_id, is_active)`
- Foreign keys on `visits.visitor_id` and `visits.officer_id`

## Migration Order
1. `database/schema.sql`
2. `database/migrations/20260722_add_rbac_and_active_visit_constraints.sql`
3. `database/migrations/20260724_simplify_user_roles.sql`

## Notes
- Migrations are intended to be idempotent where possible.
- The production role model is fixed to only `ADMIN` and `OFFICER`.
