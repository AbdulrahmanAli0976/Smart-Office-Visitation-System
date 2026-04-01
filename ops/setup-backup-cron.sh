#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/backups"
mkdir -p "$LOG_DIR"

CRON_ENTRY="0 2 * * * bash $SCRIPT_DIR/backup.sh >> $LOG_DIR/auto-backup.log 2>&1"

existing_cron=$(crontab -l 2>/dev/null || true)
cleaned_cron=$(printf '%s
' "$existing_cron" | grep -F -v "$SCRIPT_DIR/backup.sh" || true)
printf '%s
%s
' "$cleaned_cron" "$CRON_ENTRY" | grep -v '^\s*$' | crontab -

echo "Daily backup cron installed (02:00). Logs -> $LOG_DIR/auto-backup.log"
