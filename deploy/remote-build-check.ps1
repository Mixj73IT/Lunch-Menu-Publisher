$exe = 'C:\Program Files\Lunch Menu Publisher\lunch-menu-publisher.exe'
$bytes = [IO.File]::ReadAllBytes($exe)
$ascii = [Text.Encoding]::ASCII.GetString($bytes)
$unicode = [Text.Encoding]::Unicode.GetString($bytes)

Write-Host '--- build markers ---'
Write-Host ("exe LastWriteTime : {0}" -f (Get-Item $exe).LastWriteTime)
Write-Host ("FileVersion       : {0}" -f (Get-Item $exe).VersionInfo.FileVersion)
Write-Host ("marker smtpFromInput (new Settings field): {0}" -f ($ascii.Contains('smtpFromInput') -or $unicode.Contains('smtpFromInput')))
Write-Host ("marker 'Relay mode needs a From address' (new Rust): {0}" -f ($ascii.Contains('Relay mode needs a From address')))
Write-Host ("marker 'Leave BOTH user and password blank' (new hint): {0}" -f ($ascii.Contains('Leave BOTH user and password blank') -or $unicode.Contains('Leave BOTH user and password blank')))
Write-Host ("marker 'SMTP test failed: ' (real-error toast): {0}" -f ($ascii.Contains('SMTP test failed: ') -or $unicode.Contains('SMTP test failed: ')))
