# 1) Is the app running?
$proc = Get-Process -Name 'lunch-menu-publisher' -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host ("app is RUNNING (PID {0}) - leveldb may be mid-write" -f $proc.Id)
} else {
    Write-Host 'app is CLOSED - store is quiescent'
}

# 2) Dump stored SMTP settings (never prints the password value)
$ldb = 'C:\Users\micaelawhitis\AppData\Local\com.school.lunchmenu\EBWebView\Default\Local Storage\leveldb'
$text = ''
Get-ChildItem $ldb -File -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $fs = [IO.File]::Open($_.FullName, 'Open', 'Read', [IO.FileShare]::ReadWrite)
        $ms = New-Object IO.MemoryStream
        $fs.CopyTo($ms); $fs.Close()
        $b = $ms.ToArray()
        $text += [Text.Encoding]::Unicode.GetString($b)
        $text += [Text.Encoding]::UTF8.GetString($b)
    } catch {
        Write-Host ("(locked file skipped: {0})" -f $_.Name)
    }
}
function Find-All([string]$key) {
    # return EVERY occurrence so stale vs fresh values are visible
    $pat = ('lunchMenu_' + $key) + '[^\x20-\x7e]{0,24}([\x20-\x7e]{1,80})'
    $vals = [regex]::Matches($text, $pat) | ForEach-Object { ($_.Groups[1].Value.Trim([char]0)).Trim() }
    return ($vals -join '  |  ')
}
Write-Host ''
Write-Host '--- stored settings (all occurrences, oldest-first is NOT guaranteed) ---'
Write-Host ("smtpHost   : {0}" -f (Find-All 'smtpHost'))
Write-Host ("smtpPort   : '{0}'" -f (Find-All 'smtpPort'))
Write-Host ("smtpUser   : {0}" -f (Find-All 'smtpUser'))
Write-Host ("smtpFrom   : {0}" -f (Find-All 'smtpFrom'))
Write-Host ("staffEmail : {0}" -f (Find-All 'staffEmail'))
Write-Host ("password stored: {0}" -f ($text -match 'lunchMenu_smtpPassword'))
