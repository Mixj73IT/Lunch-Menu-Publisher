# Runs as buffy-fix over SSH. Feeds run.ps1 to the SYSTEM task runner,
# then polls for the result.
$ErrorActionPreference = 'Stop'
$dir    = 'C:\ProgramData\buffy-ssh'
$src    = Join-Path $dir 'incoming-run.ps1'
$run    = Join-Path $dir 'run.ps1'
$result = Join-Path $dir 'install-result.txt'

if (-not (Test-Path $src)) { Write-Host 'MISSING incoming-run.ps1'; exit 1 }
Copy-Item -Path $src -Destination $run -Force

Remove-Item $result -ErrorAction SilentlyContinue
schtasks /run /tn BuffyFixRunner

$deadline = (Get-Date).AddMinutes(10)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    if (Test-Path $result) {
        $txt = Get-Content $result -Raw
        if ($txt -match 'RESULT:') {
            Write-Host '--- install result ---'
            Write-Host $txt
            exit 0
        }
    }
}
Write-Host 'TIMEOUT waiting for install result'
exit 1
