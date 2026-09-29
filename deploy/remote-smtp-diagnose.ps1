# SMTP diagnostics - runs on the target machine. Prints NO credentials.
Write-Host '--- DNS resolution ---'
foreach ($h in 'smtp.gmail.com', 'smtp.office365.com', 'smtp-mail.outlook.com') {
    try {
        $ips = [System.Net.Dns]::GetHostAddresses($h) | Select-Object -First 1
        Write-Host ("{0} -> {1}" -f $h, $ips)
    } catch {
        Write-Host ("{0} -> DNS FAILED: {1}" -f $h, $_.Exception.Message)
    }
}

Write-Host ''
Write-Host '--- TCP connect tests (5s timeout) ---'
$targets = @(
    @{ Host = 'smtp.gmail.com';        Port = 465 },
    @{ Host = 'smtp.gmail.com';        Port = 587 },
    @{ Host = 'smtp.office365.com';    Port = 587 },
    @{ Host = 'smtp-mail.outlook.com'; Port = 587 }
)
foreach ($t in $targets) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($t.Host, $t.Port, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne(5000) -and $client.Connected) {
            Write-Host ("{0}:{1} -> OPEN" -f $t.Host, $t.Port)
        } else {
            Write-Host ("{0}:{1} -> TIMEOUT (blocked or filtered)" -f $t.Host, $t.Port)
        }
        $client.Close()
    } catch {
        Write-Host ("{0}:{1} -> FAILED: {2}" -f $t.Host, $t.Port, $_.Exception.Message)
    }
}

Write-Host ''
Write-Host '--- App SMTP host/port (from WebView2 localStorage; secrets excluded) ---'
$ldb = 'C:\Users\micaelawhitis\AppData\Local\com.school.lunchmenu\EBWebView\Default\Local Storage\leveldb'
if (Test-Path $ldb) {
    $found = @{}
    Get-ChildItem $ldb -Filter *.ldb -ErrorAction SilentlyContinue | ForEach-Object {
        $text = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($_.FullName))
        foreach ($m in [regex]::Matches($text, '(smtpHost|smtpPort|SMTP_HOST|SMTP_PORT)[\\"'']+([A-Za-z0-9\.\-]{3,60})')) {
            $found[$m.Groups[1].Value] = $m.Groups[2].Value
        }
    }
    if ($found.Count) { $found.GetEnumerator() | ForEach-Object { Write-Host ("{0} = {1}" -f $_.Key, $_.Value) } }
    else { Write-Host 'no smtp host/port strings found in leveldb scan' }
} else {
    Write-Host "leveldb folder not found: $ldb"
}
