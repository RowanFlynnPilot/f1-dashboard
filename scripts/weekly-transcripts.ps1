<#
.SYNOPSIS
  Fetch new F1 reaction-video transcripts, commit them and push, so CI can
  extract the drivers' quotes.

.DESCRIPTION
  YouTube blocks GitHub Actions' IP ranges, so transcripts are fetched from a
  home connection. The "F1 Dashboard transcripts" scheduled task runs this on
  Mondays and Tuesdays at 09:00 (and at the next chance if the PC was off).
  The push triggers the deploy workflow, which extracts the quotes with Claude.
  Output is appended to %LOCALAPPDATA%\f1-dashboard-transcripts.log.

  Register or update the task (once, as the logged-in user):
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\weekly-transcripts.ps1 -Register
  Remove it:
    Unregister-ScheduledTask -TaskName "F1 Dashboard transcripts" -Confirm:$false
#>
param([switch]$Register)

# Decode native output as UTF-8 (the fetch script prints emoji; the console's
# OEM code page garbled them in the log)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"

$TaskName = "F1 Dashboard transcripts"
$Repo = Split-Path -Parent $PSScriptRoot
$Log = Join-Path $env:LOCALAPPDATA "f1-dashboard-transcripts.log"

if ($Register) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`"" `
    -WorkingDirectory $Repo
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Tuesday -At 9am
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Fetch F1 reaction-video transcripts and push them to f1-dashboard" -Force | Out-Null
  Write-Host "Registered '$TaskName': Mondays and Tuesdays at 09:00, or at the next chance if missed."
  return
}

function Write-Log([string]$Message) {
  $line = "$(Get-Date -Format s)  $Message"
  Add-Content -Path $Log -Value $line
  Write-Host $line
}

# Native commands only: their exit codes are checked explicitly. (Windows
# PowerShell 5.1 turns anything a native command writes to stderr, such as
# git's progress lines, into error records, so -ErrorAction Stop would abort.)
function Invoke-Step([string]$Label, [scriptblock]$Command) {
  $output = & $Command 2>&1 | ForEach-Object { "$_" }
  foreach ($o in $output) { if ($o) { Write-Log "  $o" } }
  if ($LASTEXITCODE -ne 0) { Write-Log "FAILED: $Label (exit $LASTEXITCODE)"; exit 1 }
}

Set-Location $Repo
Write-Log "--- transcripts run in $Repo"
Invoke-Step "git pull" { git pull --rebase --autostash }
Invoke-Step "fetch transcripts" { python scripts/fetch-driver-quotes.py --fetch-transcripts }

git add scripts/transcripts scripts/video-ids.json
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Log "No new transcripts."; exit 0 }

$stamp = Get-Date -Format "yyyy-MM-dd"
Invoke-Step "git commit" { git commit -m "Cache race transcripts ($stamp)" }
Invoke-Step "git push" { git push }
Write-Log "Pushed new transcripts; the deploy workflow will extract the quotes."
