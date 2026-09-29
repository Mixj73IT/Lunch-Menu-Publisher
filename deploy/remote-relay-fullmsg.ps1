# Reproduce the app's exact send: relay, no auth, STARTTLS,
# MAIL FROM kitchen@somersetchristian.com -> RCPT jrhaynes@somersetchristian.com,
# full DATA (subject + body). Print every SMTP reply verbatim.
$ErrorActionPreference = 'Stop'
$relayHost = 'smtp-relay.gmail.com'
$from = 'kitchen@somersetchristian.com'
$to = 'jrhaynes@somersetchristian.com'

function Read-SmtpLine([IO.Stream]$s) {
    $ms = New-Object IO.MemoryStream
    while ($true) {
        $b = $s.ReadByte()
        if ($b -lt 0) { break }
        if ($b -eq 10) { break }
        if ($b -ne 13) { $ms.WriteByte([byte]$b) }
    }
    return [Text.Encoding]::ASCII.GetString($ms.ToArray())
}
function Send-SmtpLine([IO.Stream]$s, [string]$line) {
    $bytes = [Text.Encoding]::ASCII.GetBytes($line + "`r`n")
    $s.Write($bytes, 0, $bytes.Length); $s.Flush()
    Write-Host ("C: {0}" -f $line)
}
function Read-SmtpReply([IO.Stream]$s) {
    $lines = @()
    while ($true) {
        $line = Read-SmtpLine $s
        Write-Host ("S: {0}" -f $line)
        $lines += $line
        if ($line -match '^\d{3} ') { break }
        if ($line -eq '') { break }
    }
    return ($lines -join ' | ')
}

$client = New-Object System.Net.Sockets.TcpClient($relayHost, 587)
$stream = $client.GetStream()
$stream.ReadTimeout = 15000

Read-SmtpReply $stream | Out-Null
Send-SmtpLine $stream 'EHLO lunchmenu-publisher' | Out-Null
Read-SmtpReply $stream | Out-Null
Send-SmtpLine $stream 'STARTTLS' | Out-Null
Read-SmtpLine $stream | Out-Null
$tls = New-Object System.Net.Security.SslStream($stream)
$tls.AuthenticateAsClient($relayHost)
Write-Host '[TLS established]'
Send-SmtpLine $tls 'EHLO lunchmenu-publisher' | Out-Null
Read-SmtpReply $tls | Out-Null

Send-SmtpLine $tls ("MAIL FROM:<{0}>" -f $from) | Out-Null
$mailFrom = Read-SmtpReply $tls
Send-SmtpLine $tls ("RCPT TO:<{0}>" -f $to) | Out-Null
$rcpt = Read-SmtpReply $tls
Send-SmtpLine $tls 'DATA' | Out-Null
$dataGo = Read-SmtpReply $tls

$queued = ''
if ($dataGo -match '^354') {
    $body = "From: Lunch Menu Publisher <kitchen@somersetchristian.com>`r`nTo: <jrhaynes@somersetchristian.com>`r`nSubject: Relay probe - can ignore`r`nMIME-Version: 1.0`r`nContent-Type: text/plain; charset=utf-8`r`n`r`nThis is an automated relay probe from the Lunch Menu Publisher diagnostics. You can delete it.`r`n."
    Send-SmtpLine $tls $body | Out-Null
    $queued = Read-SmtpReply $tls
}

Write-Host ''
Write-Host ("MAIL FROM: {0}" -f $mailFrom)
Write-Host ("RCPT TO:   {0}" -f $rcpt)
Write-Host ("DATA:      {0}" -f $dataGo)
Write-Host ("QUEUED:    {0}" -f $queued)
if ($mailFrom -match '^250' -and $rcpt -match '^250' -and $queued -match '^250') {
    Write-Host 'RESULT: FULL MESSAGE ACCEPTED by relay (check jrhaynes@ inbox).' -ForegroundColor Green
} else {
    Write-Host 'RESULT: REJECTED - the replies above are the exact error.' -ForegroundColor Red
}
Send-SmtpLine $tls 'QUIT' | Out-Null
Start-Sleep -Milliseconds 300
$client.Close()
