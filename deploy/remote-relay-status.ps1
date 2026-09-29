# Throttle status: ONE quiet connection (banner + EHLO + QUIT).
# No TLS, no message, no STARTTLS - as little footprint as possible.
$ErrorActionPreference = 'Stop'
$client = New-Object System.Net.Sockets.TcpClient('smtp-relay.gmail.com', 587)
$stream = $client.GetStream()
$stream.ReadTimeout = 10000

function Read-Line([IO.Stream]$s) {
    $ms = New-Object IO.MemoryStream
    while ($true) {
        $b = $s.ReadByte()
        if ($b -lt 0 -or $b -eq 10) { break }
        if ($b -ne 13) { $ms.WriteByte([byte]$b) }
    }
    return [Text.Encoding]::ASCII.GetString($ms.ToArray())
}

$banner = Read-Line $stream
Write-Host ("banner: {0}" -f $banner)

if ($banner -match '^220') {
    $cmd = [Text.Encoding]::ASCII.GetBytes("EHLO status-check`r`n")
    $stream.Write($cmd, 0, $cmd.Length); $stream.Flush()
    $ehlo = Read-Line $stream
    Write-Host ("ehlo:   {0}" -f $ehlo)
    if ($ehlo -match '^250') {
        Write-Host 'STATUS: CLEAR - relay is accepting connections again.' -ForegroundColor Green
    } elseif ($ehlo -match '^4') {
        Write-Host 'STATUS: STILL THROTTLED (4xx at EHLO).' -ForegroundColor Yellow
    } else {
        Write-Host 'STATUS: UNEXPECTED EHLO REPLY.' -ForegroundColor Red
    }
    $q = [Text.Encoding]::ASCII.GetBytes("QUIT`r`n")
    $stream.Write($q, 0, $q.Length); $stream.Flush()
} elseif ($banner -match '^4') {
    Write-Host 'STATUS: STILL THROTTLED (4xx at banner).' -ForegroundColor Yellow
} else {
    Write-Host 'STATUS: UNEXPECTED BANNER.' -ForegroundColor Red
}
Start-Sleep -Milliseconds 200
$client.Close()
