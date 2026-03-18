#!/usr/bin/env bash
set -euo pipefail

BACKUP_PATH=${1:-}
if [[ -z "$BACKUP_PATH" ]]; then
  echo "Usage: ./restore.sh /path/to/backup.sql"
  exit 1
fi
if [[ ! -f "$BACKUP_PATH" ]]; then
  echo "Backup file not found: $BACKUP_PATH"
  exit 1
fi

DB_NAME=${DB_NAME:-visitor_management}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}

PASS_ARG=""
if [[ -n "$DB_PASSWORD" ]]; then
  PASS_ARG="-p${DB_PASSWORD}"
fi

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $PASS_ARG "$DB_NAME" < "$BACKUP_PATH"

echo "Restore completed from $BACKUP_PATH"
