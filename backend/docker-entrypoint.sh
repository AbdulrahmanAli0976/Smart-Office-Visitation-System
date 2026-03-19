#!/bin/sh
set -e

if [ -d /app/logs ]; then
  chown -R node:node /app/logs || true
fi

exec su-exec node node src/server.js
