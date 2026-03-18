param(
  [string]$Database = $env:DB_NAME,
  [string]$User = $env:DB_USER,
  [string]$Password = $env:DB_PASSWORD,
  [string]$Host = $env:DB_HOST,
  [string]$Port = $env:DB_PORT
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $PSScriptRoot "backups"
New-Item -ItemType Directory -Force $backupDir | Out-Null

$dumpPath = Join-Path $backupDir ("${Database}_${timestamp}.sql")
$mysqldump = "C:\xampp\mysql\bin\mysqldump.exe"

$passArg = if ($Password) { "-p$Password" } else { "" }

& $mysqldump -h $Host -P $Port -u $User $passArg $Database | Set-Content -Encoding utf8 $dumpPath

Write-Host "Backup saved to $dumpPath"
