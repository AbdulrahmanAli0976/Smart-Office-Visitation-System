#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${DB_NAME:-visitor_management}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

PASS_ARG=""
if [[ -n "$DB_PASSWORD" ]]; then
  PASS_ARG="-p${DB_PASSWORD}"
fi

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $PASS_ARG "$DB_NAME" > "$BACKUP_PATH"

echo "Backup saved to $BACKUP_PATH"
