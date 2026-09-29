# Verification script - runs as buffy-fix over SSH.
Write-Host '--- WebView2 data folders (Local + Roaming) ---'
Get-ChildItem 'C:\Users' -Directory | ForEach-Object {
    $u = $_.FullName
    $local   = Join-Path $u 'AppData\Local\com.school.lunchmenu'
    $roaming = Join-Path $u 'AppData\Roaming\com.school.lunchmenu'
    # Tauri v2 default identifier path is often under <AppData>\roaming\<identifier>
    # but WebView2 data can also sit in a EBWebView folder - check both spellings.
    $altLocal = Join-Path $u 'AppData\Local\Lunch Menu Publisher'
    $altRoam  = Join-Path $u 'AppData\Roaming\Lunch Menu Publisher'
    foreach ($p in @($local, $roaming, $altLocal, $altRoam)) {
        if (Test-Path $p) {
            $size = (Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
            Write-Host ("FOUND: {0}  ({1:N0} KB)" -f $p, ($size / 1KB))
            if (Test-Path (Join-Path $p 'EBWebView')) {
                Write-Host '  -> WebView2 profile present (localStorage lives here)'
            }
        }
    }
}
Write-Host ''
Write-Host '--- PDF bundles inside installed exe ---'
$exe = 'C:\Program Files\Lunch Menu Publisher\lunch-menu-publisher.exe'
$bytes = [IO.File]::ReadAllBytes($exe)
$ascii = [Text.Encoding]::ASCII.GetString($bytes)
Write-Host ("jspdf.umd.min.js: {0}" -f $ascii.Contains('jspdf.umd.min.js'))
Write-Host ("html2canvas.min.js: {0}" -f $ascii.Contains('html2canvas.min.js'))
Write-Host ("exe version: {0}" -f (Get-Item $exe).VersionInfo.FileVersion)
