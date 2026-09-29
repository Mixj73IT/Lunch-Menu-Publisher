# Identify the school's public IP (as Google will see it) and test
# reachability of Google's SMTP relay endpoints.
Write-Host '--- public IP of this network (paste this into Google admin) ---'
try {
    $ip = (Invoke-RestMethod -Uri 'https://api.ipify.org?format=json').ip
    Write-Host $ip
} catch {
    Write-Host ("lookup failed: {0}" -f $_.Exception.Message)
}

Write-Host ''
Write-Host '--- smtp-relay.gmail.com TCP reachability ---'
foreach ($p in 25, 465, 587) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect('smtp-relay.gmail.com', $p, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne(5000) -and $client.Connected) {
            Write-Host ("port {0} -> OPEN" -f $p)
        } else {
            Write-Host ("port {0} -> timeout" -f $p)
        }
        $client.Close()
    } catch {
        Write-Host ("port {0} -> failed ({1})" -f $p, $_.Exception.Message)
    }
}
