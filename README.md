# Smart Office Visitation System

## Overview

Smart Attendance System is an enterprise-grade visitor management platform with role-based access control, audit logging, visitor tracking, and reporting.

## Repository Structure

- `backend/` — Node.js Express API
- `frontend/` — React + Vite + Tailwind UI
- `database/` — MySQL schema and migrations
- `docs/` — Supporting documentation and archives
- `ops/` — Operational scripts and deployment validation

## Key Release Documents

- `CHANGELOG.md` — Release history
- `VERSION` — Current release version
- `LICENSE` — License terms
- `SECURITY.md` — Security policy
- `CONTRIBUTING.md` — Contribution guidelines
- `RELEASE_NOTES.md` — v1.0.0 release summary
- `DEPLOYMENT_GUIDE.md` — Deployment instructions
- `ARCHITECTURE.md` — System architecture overview

## Quick Start (Docker)

1. Copy `.env.docker.example` to `.env` and configure values.
2. Run:
   - `docker compose up -d --build`
3. Access:
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:4000`
4. Stop services:
   - `docker compose down`

## Local Development

1. Copy `.env.example` to `.env` and configure backend values.
2. Backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
3. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Documentation

For full documentation, see the `docs/` folder:
- `docs/OVERVIEW.md`
- `docs/API_REFERENCE.md`
- `docs/DATABASE.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/RBAC.md`
- `docs/TEST_REPORT.md`

## Notes

- Environment secrets must be managed outside source control.
- Use `.env.example` and `.env.docker.example` as templates only.
- The application supports two roles: `ADMIN` and `OFFICER`.
