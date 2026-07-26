#!/bin/sh
set -e

if [ -d /app/logs ]; then
  chown -R node:node /app/logs || true
fi

if [ -n "$ADMIN_NAME" ] && [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  su-exec node node scripts/seed-admin.js
fi

exec su-exec node node src/server.js
