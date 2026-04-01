#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if it exists in root or backend
if [[ -f "$SCRIPT_DIR/../.env" ]]; then
  source "$SCRIPT_DIR/../.env"
elif [[ -f "$SCRIPT_DIR/../backend/.env" ]]; then
  source "$SCRIPT_DIR/../backend/.env"
fi

DB_NAME=${DB_NAME:-visitor_management}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}

BACKUP_DIR="$SCRIPT_DIR/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

# Use environment variable for password to avoid CLI warning
export MYSQL_PWD="$DB_PASSWORD"

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" > "$BACKUP_PATH"

echo "Backup saved to $BACKUP_PATH"

# Retention: Delete backups older than 7 days
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
echo "Old backups cleaned (7-day retention)."
