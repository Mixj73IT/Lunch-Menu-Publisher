# 1) Current stored settings (secrets never printed)
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
    } catch { }
}
function Find-Value([string]$key) {
    $pat = ('lunchMenu_' + $key) + '[^\x20-\x7e]{0,24}([\x20-\x7e]{1,80})'
    $m = [regex]::Match($text, $pat)
    if ($m.Success) { return ($m.Groups[1].Value.Trim([char]0)).Trim() }
    return ''
}
Write-Host '--- stored settings now ---'
Write-Host ("smtpHost   = {0}" -f (Find-Value 'smtpHost'))
Write-Host ("smtpPort   = '{0}'" -f (Find-Value 'smtpPort'))
Write-Host ("smtpUser   = {0}" -f (Find-Value 'smtpUser'))
Write-Host ("smtpFrom   = {0}" -f (Find-Value 'smtpFrom'))
$hasPass = $text -match 'lunchMenu_smtpPassword'
Write-Host ("smtpPassword present in store: {0}" -f $hasPass)

# 2) Simulate the app's Test Connection: TCP -> (TLS) -> EHLO -> NOOP
function Test-SmtpEndpoint([string]$h, [int]$p) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($h, $p, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne(6000) -or -not $client.Connected) {
            return 'TCP timeout'
        }
        $stream = $client.GetStream()
        $stream.ReadTimeout = 6000
        if ($p -eq 465) {
            $tls = New-Object System.Net.Security.SslStream($stream)
            $tls.AuthenticateAsClient($h)
            $stream = $tls
        }
        $ms = New-Object IO.MemoryStream
        while ($true) {
            $b = $stream.ReadByte()
            if ($b -lt 0 -or $b -eq 10) { break }
            if ($b -ne 13) { $ms.WriteByte([byte]$b) }
        }
        $banner = [Text.Encoding]::ASCII.GetString($ms.ToArray())
        if ($banner -notmatch '^220') { return ("unexpected banner: " + $banner) }

        $cmd = [Text.Encoding]::ASCII.GetBytes("EHLO test.local`r`n")
        $stream.Write($cmd, 0, $cmd.Length); $stream.Flush()
        $ms = New-Object IO.MemoryStream
        while ($true) {
            $b = $stream.ReadByte()
            if ($b -lt 0) { break }
            if ($b -ne 13) { $ms.WriteByte([byte]$b) }
            if ($b -eq 10 -and $ms.Length -gt 0) {
                $s = [Text.Encoding]::ASCII.GetString($ms.ToArray())
                if ($s -match '\r?\n?\d{3} ') { break }
            }
        }
        $ehlo = [Text.Encoding]::ASCII.GetString($ms.ToArray())
        $client.Close()
        if ($ehlo -match 'STARTTLS' -and $p -ne 465) { return "OK (STARTTLS offered)" }
        return 'OK'
    } catch {
        try { $client.Close() } catch { }
        return ("failed: " + $_.Exception.Message)
    }
}

Write-Host ''
Write-Host '--- test_connection simulation (EHLO+NOOP path) ---'
Write-Host ("smtp-relay.gmail.com:587 -> {0}" -f (Test-SmtpEndpoint 'smtp-relay.gmail.com' 587))
Write-Host ("smtp-relay.gmail.com:465 -> {0}" -f (Test-SmtpEndpoint 'smtp-relay.gmail.com' 465))
Write-Host ("smtp-relay.gmail.com:25  -> {0}" -f (Test-SmtpEndpoint 'smtp-relay.gmail.com' 25))
