# Visitor Management System

## Overview
Production-ready Visitor Management System with role-based access, smart search, and visit tracking.

## Structure
- `backend/` Node.js (Express) API
- `frontend/` React + Tailwind UI
- `database/schema.sql` MySQL schema

## Quick Start
1. Create the database and tables:
   - Run `database/schema.sql` in MySQL.
2. Backend:
   - Copy `backend/.env.example` to `backend/.env` and update values.
   - Install dependencies and start the API:
     - `npm install`
     - `npm run dev`
3. Seed an admin user:
   - `node scripts/seed-admin.js "Admin Name" admin@example.com StrongPassword123!`
4. Frontend:
   - Copy `frontend/.env.example` to `frontend/.env` if needed.
   - Install dependencies and start the UI:
     - `npm install`
     - `npm run dev`

## Docker Quick Start
1. Copy `.env.docker.example` to `.env` and update values.
2. Run `docker compose up -d --build`.
3. Open `http://localhost:8080`.
4. Stop with `docker compose down`.

## Notes
- Officers register via `/api/auth/register` and must be approved by admin.
- Only ACTIVE officers can log in and use the system.
