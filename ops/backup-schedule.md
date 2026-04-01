# Backup Scheduling

## Linux / WSL
1. Run `bash ops/setup-backup-cron.sh` from the repo root. The script installs a daily 02:00 cron entry and rotates `ops/backups/auto-backup.log`.
2. Verify with `crontab -l` that the new job exists and check `ops/backups/auto-backup.log` after the next run.

## Windows
1. Open an elevated PowerShell prompt and run `.\ops\setup-backup-task.ps1`. The script registers a `VMSDailyBackup` task that invokes `ops/backup.ps1` daily at 02:00 and overwrites the task if it already exists.
2. Inspect the task with `Get-ScheduledTask -TaskName VMSDailyBackup` and review `ops\backups` for new dumps.

## Restore verification
- Use `bash ops/restore.sh ops/backups/<dump>.sql` (Linux) or `powershell -ExecutionPolicy Bypass -File ops/restore.ps1 -BackupPath ops\backups\<dump>.sql` (Windows) to confirm restore works.
