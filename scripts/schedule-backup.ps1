$ErrorActionPreference = 'SilentlyContinue'

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c "E:\KASIR MIE JEBEW\warungos\scripts\backup.bat"'
$trigger = New-ScheduledTaskTrigger -Daily -At 2AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -RunLevel 'Highest'

if (Get-ScheduledTask -TaskName 'warungos-db-backup' -ErrorAction SilentlyContinue) {
    Set-ScheduledTask -TaskName 'warungos-db-backup' -Action $action -Trigger $trigger -Settings $settings -Principal $principal
    Write-Host 'warungos-db-backup task updated.'
}
else {
    Register-ScheduledTask -TaskName 'warungos-db-backup' -Action $action -Trigger $trigger -Settings $settings -Principal $principal
    Write-Host 'warungos-db-backup task created.'
}
