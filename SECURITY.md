# Security Policy

## Overview
This repository is designed for enterprise deployment and includes security controls for authentication, authorization, data protection, and operational hardening.

## Authentication
- JSON Web Tokens (JWT) are used for API authentication.
- Logout revokes tokens by storing them in a blacklist table.
- Tokens are configured with expiration times to minimize exposure.

## Authorization
- Role-based access control is enforced at the route level.
- Only `ADMIN` and `OFFICER` roles are valid.
- Admin-only routes are protected by middleware.

## Data Protection
- Passwords are hashed using bcrypt.
- No plaintext passwords are stored in source control.
- All database queries use parameterized statements to prevent SQL injection.

## Application Security
- `helmet()` is enabled to set secure HTTP headers.
- CORS is restricted to authorized origins.
- Rate limiting is configured for API endpoints.
- Input validation and sanitization are applied in the backend.

## Operational Security
- Sensitive `.env` files are excluded from version control via `.gitignore`.
- Use secure secret management for production environment values.
- Monitor logs and verify audit trails regularly.

## Incident Reporting
- Report security issues privately rather than opening public issues.
- Follow responsible disclosure and coordinate with project maintainers.
