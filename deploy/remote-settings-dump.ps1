# Diagnose the failed email: read current (non-secret) SMTP settings from
# the app's localStorage store. Never prints the stored password.
$ldb = 'C:\Users\micaelawhitis\AppData\Local\com.school.lunchmenu\EBWebView\Default\Local Storage\leveldb'
$text = ''
Get-ChildItem $ldb -File -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $fs = [IO.File]::Open($_.FullName, 'Open', 'Read', [IO.FileShare]::ReadWrite)
        $ms = New-Object IO.MemoryStream
        $fs.CopyTo($ms); $fs.Close()
        $bytes = $ms.ToArray()
        $text += [Text.Encoding]::Unicode.GetString($bytes)
        $text += [Text.Encoding]::UTF8.GetString($bytes)
    } catch { }
}

function Find-Value([string]$key) {
    # lunchMenu_smtpHost<...>value pattern in the leveldb bytes
    $pat = ('lunchMenu_' + $key) + '[^\x20-\x7e]{0,24}([\x20-\x7e]{1,80})'
    $m = [regex]::Match($text, $pat)
    if ($m.Success) { return ($m.Groups[1].Value.Trim([char]0)).Trim() }
    return ''
}

$host_ = Find-Value 'smtpHost'
$port  = Find-Value 'smtpPort'
$user  = Find-Value 'smtpUser'
$from  = Find-Value 'smtpFrom'
$staff = Find-Value 'staffEmail'
$passSet = $text -match 'lunchMenu_smtpPassword'

Write-Host '--- current app SMTP settings ---'
Write-Host ("smtpHost    = '{0}'" -f $host_)
Write-Host ("smtpPort    = '{0}'" -f $port)
Write-Host ("smtpUser    = '{0}'" -f $user)
Write-Host ("smtpFrom    = '{0}'" -f $from)
Write-Host ("staffEmail  = '{0}'" -f $staff)
Write-Host ("password set: {0}" -f ($passSet -and -not [string]::IsNullOrEmpty($user)))
