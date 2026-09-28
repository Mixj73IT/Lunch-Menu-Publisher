# Smoke test: launch the app, wait, confirm it stays up, close it.
Start-Process 'C:\Program Files\Lunch Menu Publisher\lunch-menu-publisher.exe'
Start-Sleep -Seconds 12
$p = Get-Process -Name 'lunch-menu-publisher' -ErrorAction SilentlyContinue
if ($p) {
    Write-Host ("SMOKE TEST OK - process running (PID {0})" -f $p.Id)
    Stop-Process -Name 'lunch-menu-publisher' -Force
    Write-Host 'App closed.'
} else {
    Write-Host 'SMOKE TEST FAILED - process not running after 12s'
}
