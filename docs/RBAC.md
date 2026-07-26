# Role-Based Access Control

## Final Role Model
Only two business roles are supported:
- `ADMIN`
- `OFFICER`

No other role values are permitted in runtime code, routes, schema, or migrations.

## Authorization Flow
1. User authenticates with `/api/auth/login`.
2. JWT is issued with the authenticated user role and status.
3. `requireAuth` validates the token.
4. `requireActiveOfficer` resolves the latest DB status and role for the user.
5. Route-level `requireRole(...)` checks enforce admin-only access where required.

## Permissions
### `ADMIN`
- Manage officer accounts
- Approve/deactivate/delete officers
- View dashboard metrics
- Create/update visitors
- Create/check-in/check-out visits
- View reports

### `OFFICER`
- Create/update visitors
- Create/check-in/check-out visits
- View summary and report views that are not admin-only
- Cannot access admin officer management or the admin dashboard

## Security Model
- JWT verification is required for protected routes.
- Inactive accounts are blocked from authentication.
- Logout revokes the current token into the blacklist table.
- Audit events capture significant actions.
