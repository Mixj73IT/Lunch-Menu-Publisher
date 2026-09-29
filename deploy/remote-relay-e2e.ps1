# End-to-end relay test: STARTTLS, NO authentication, probe message.
# Byte-level line reads so nothing is buffered across the STARTTLS upgrade.
$ErrorActionPreference = 'Stop'
$relayHost = 'smtp-relay.gmail.com'
$from = 'lunchmenu@somersetchristian.com'
$to = 'lunchmenu@somersetchristian.com'

function Read-SmtpLine([IO.Stream]$s) {
    $ms = New-Object IO.MemoryStream
    while ($true) {
        $b = $s.ReadByte()
        if ($b -lt 0) { break }
        if ($b -eq 10) { break }   # LF ends the line
        if ($b -ne 13) { $ms.WriteByte([byte]$b) }  # skip CR
    }
    return [Text.Encoding]::ASCII.GetString($ms.ToArray())
}

function Send-SmtpLine([IO.Stream]$s, [string]$line) {
    $bytes = [Text.Encoding]::ASCII.GetBytes($line + "`r`n")
    $s.Write($bytes, 0, $bytes.Length)
    $s.Flush()
    Write-Host ("C: {0}" -f $line)
}

function Read-SmtpReply([IO.Stream]$s) {
    $lines = @()
    while ($true) {
        $line = Read-SmtpLine $s
        Write-Host ("S: {0}" -f $line)
        $lines += $line
        if ($line -match '^\d{3} ') { break }   # no dash = final line
        if ($line -eq '') { break }
    }
    return ($lines -join ' | ')
}

Write-Host ("connecting to {0}:587 ..." -f $relayHost)
$client = New-Object System.Net.Sockets.TcpClient($relayHost, 587)
$stream = $client.GetStream()

$banner = Read-SmtpReply $stream
Send-SmtpLine $stream 'EHLO lunchmenu-publisher.local' | Out-Null
$ehlo = Read-SmtpReply $stream

Send-SmtpLine $stream 'STARTTLS' | Out-Null
$starttls = Read-SmtpLine $stream
Write-Host ("S: {0}" -f $starttls)

$tls = New-Object System.Net.Security.SslStream($stream)
$tls.AuthenticateAsClient($relayHost)
Write-Host 'TLS established'

Send-SmtpLine $tls 'EHLO lunchmenu-publisher.local' | Out-Null
Read-SmtpReply $tls | Out-Null

Send-SmtpLine $tls ("MAIL FROM:<{0}>" -f $from) | Out-Null
$mailFrom = Read-SmtpReply $tls
Send-SmtpLine $tls ("RCPT TO:<{0}>" -f $to) | Out-Null
$rcpt = Read-SmtpReply $tls

Write-Host ''
if ($mailFrom -match '^250' -and $rcpt -match '^250') {
    Write-Host 'RELAY ACCEPTED: unauthenticated send from this IP works.' -ForegroundColor Green
    Write-Host 'App settings: host smtp-relay.gmail.com, port 587,'
    Write-Host 'user/password BLANK, From lunchmenu@somersetchristian.com'
} else {
    Write-Host 'RELAY REJECTED at envelope stage - check Google relay config:' -ForegroundColor Red
    Write-Host ("  MAIL FROM reply: {0}" -f $mailFrom)
    Write-Host ("  RCPT TO   reply: {0}" -f $rcpt)
}

Send-SmtpLine $tls 'QUIT' | Out-Null
Start-Sleep -Milliseconds 300
$client.Close()
