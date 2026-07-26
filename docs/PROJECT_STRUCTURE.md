# Project Structure

## Backend
- `src/app.js` — application bootstrap and middleware wiring
- `src/server.js` — startup, DB retry loop, graceful shutdown
- `src/routes/` — API route definitions
- `src/services/` — business logic and DB orchestration
- `src/middleware/` — auth and error handling
- `src/config/` — environment, DB, role configuration

## Frontend
- `src/App.jsx` — router and route guards
- `src/api.js` — API client wrapper
- `src/pages/` — login, dashboard, visitors, visits, reports, admin pages
- `src/components/` — UI layout and panels

## Database
- `database/schema.sql` — canonical schema
- `database/migrations/` — versioned migration files

## Operations
- `ops/` — backup, deployment, and maintenance scripts
