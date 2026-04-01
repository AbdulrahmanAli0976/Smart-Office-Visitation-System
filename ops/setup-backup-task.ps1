param(
  [string]$TaskName = 'VMSDailyBackup',
  [string]$TriggerTime = '02:00'
)

$scriptPath = Join-Path $PSScriptRoot 'backup.ps1'
if (-not (Test-Path $scriptPath)) {
  throw "Backup script not found at $scriptPath"
}

$timeParts = $TriggerTime.Split(':')
if ($timeParts.Count -ne 2) {
  throw 'TriggerTime must be in HH:mm format'
}

$triggerHour = [int]$timeParts[0]
$triggerMinute = [int]$timeParts[1]
$trigger = New-ScheduledTaskTrigger -Daily -At (Get-Date -Hour $triggerHour -Minute $triggerMinute -Second 0)
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

Register-ScheduledTask -TaskName $TaskName -Trigger $trigger -Action $action -RunLevel Highest -Force
Write-Host "Scheduled task '$TaskName' registered to run daily at $TriggerTime"
