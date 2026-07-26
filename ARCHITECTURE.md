# Architecture Overview

## System Components

The Smart Attendance System is composed of three primary layers:

1. **Frontend**
   - React application built with Vite.
   - Uses Tailwind CSS for styling.
   - Routes and page guards are implemented with React Router.
   - Protects authenticated pages via JWT tokens.

2. **Backend**
   - Node.js and Express API.
   - Modular architecture with routes, services, middleware, and utils.
   - Handles authentication, authorization, visitor and visit workflows, and reporting.
   - Uses MySQL for persistence.

3. **Database**
   - MySQL 8.x database.
   - Canonical schema in `database/schema.sql`.
   - Versioned migrations under `database/migrations/`.
   - Supports audit logging, soft deletes, and referential integrity.

## Deployment

- Primary deployment is containerized using Docker Compose.
- Services include:
  - `db` MySQL database
  - `backend` Express API
  - `frontend` Nginx serving the React app
- Production-ready orchestration is defined in `docker-compose.prod.yml`.

## Security Architecture

- JWT is used for stateless authentication.
- Role-based access control is enforced for `ADMIN` and `OFFICER` roles.
- Sensitive routes are protected by middleware.
- Audit logs capture user actions and request context.
- Security headers and rate limiting are enabled.

## Data Flow

1. User logs in through the frontend.
2. Frontend sends credentials to backend auth endpoint.
3. Backend issues JWT token on successful authentication.
4. Frontend stores the token and includes it in subsequent API requests.
5. Backend validates token and user role before handling requests.
6. Visitor and visit data is stored in MySQL and returned to the frontend.

## Documentation
- Developer documentation and API reference are available under `docs/`.
- Project structure is documented in `docs/PROJECT_STRUCTURE.md`.
