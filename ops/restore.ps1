param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$Database = $env:DB_NAME,
  [string]$User = $env:DB_USER,
  [string]$Password = $env:DB_PASSWORD,
  [string]$Host = $env:DB_HOST,
  [string]$Port = $env:DB_PORT
)

if (!(Test-Path $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$mysql = "C:\xampp\mysql\bin\mysql.exe"
$passArg = if ($Password) { "-p$Password" } else { "" }

Get-Content $BackupPath | & $mysql -h $Host -P $Port -u $User $passArg $Database

Write-Host "Restore completed from $BackupPath"
