param(
  [string]$Database = $env:DB_NAME,
  [string]$User = $env:DB_USER,
  [string]$Password = $env:DB_PASSWORD,
  [string]$Host = $env:DB_HOST,
  [string]$Port = $env:DB_PORT
)

# Load environment if not already set
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '=' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        if (-not $env:$name) { $env:$name = $value.Trim('"').Trim("'") }
    }
}

$Database = if ($Database) { $Database } else { $env:DB_NAME }
$User = if ($User) { $User } else { $env:DB_USER }
$Password = if ($Password) { $Password } else { $env:DB_PASSWORD }
$Host = if ($Host) { $Host } else { $env:DB_HOST }
$Port = if ($Port) { $Port } else { $env:DB_PORT }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $PSScriptRoot "backups"
New-Item -ItemType Directory -Force $backupDir | Out-Null

$dumpPath = Join-Path $backupDir ("${Database}_${timestamp}.sql")

# Try to find mysqldump
$mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $mysqldump) {
    $mysqldump = "C:\xampp\mysql\bin\mysqldump.exe"
}

if (-not (Test-Path $mysqldump)) {
    Write-Error "mysqldump not found at $mysqldump"
    exit 1
}

$env:MYSQL_PWD = $Password
& $mysqldump -h $Host -P $Port -u $User $Database | Set-Content -Encoding utf8 $dumpPath
$env:MYSQL_PWD = $null

Write-Host "Backup saved to $dumpPath"

# Retention: Delete backups older than 7 days
Get-ChildItem $backupDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
Write-Host "Old backups cleaned (7-day retention)."
