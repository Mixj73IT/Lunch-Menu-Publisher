# Runs as SYSTEM via the BuffyFixRunner scheduled task.
# SAFETY FIRST: backs up all app data (WebView2 localStorage) for every
# user BEFORE touching the installation. Then installs the new MSI.
$ErrorActionPreference = 'Continue'
$dir      = 'C:\ProgramData\buffy-ssh'
$msi      = Join-Path $dir 'LunchMenuFix.msi'
$result   = Join-Path $dir 'install-result.txt'
$log      = Join-Path $dir 'msi-install.log'
$backupRo = Join-Path $dir 'data-backup'

$exe = 'C:\Program Files\Lunch Menu Publisher\lunch-menu-publisher.exe'
$before = if (Test-Path $exe) { (Get-Item $exe).LastWriteTime.ToString('s') } else { 'not-installed' }
"run started $(Get-Date -Format s) | exe before: $before" | Set-Content -Path $result

if (-not (Test-Path $msi)) {
    Add-Content -Path $result -Value 'ERROR: MSI not found'
    exit 1
}

# --- 0. SAFETY: stop app, then back up ALL user data ------------------
# Menu data lives in WebView2 localStorage under
#   C:\Users\<user>\AppData\Roaming\com.school.lunchmenu
# The MSI never touches this folder, but we back it up anyway.
Stop-Process -Name 'lunch-menu-publisher' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$found = 0
Get-ChildItem 'C:\Users' -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $src = Join-Path $_.FullName 'AppData\Roaming\com.school.lunchmenu'
    if (Test-Path $src) {
        $dst = Join-Path $backupRo ("{0}_{1}" -f $_.Name, $stamp)
        robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -lt 8) {
            Add-Content -Path $result -Value "BACKED UP: $src -> $dst"
            $found++
        } else {
            Add-Content -Path $result -Value "BACKUP FAILED for $src (robocopy exit $LASTEXITCODE) - ABORTING"
        }
    }
}
if ($found -eq 0) {
    Add-Content -Path $result -Value 'NOTE: no com.school.lunchmenu data folders found (nothing to back up)'
}

# --- 1. Install --------------------------------------------------------
function Invoke-Msi([string]$argsLine) {
    $p = Start-Process -FilePath 'msiexec.exe' -ArgumentList $argsLine -Wait -PassThru
    return $p.ExitCode
}

$exitCode = Invoke-Msi "/i `"$msi`" /qn /norestart /l*v `"$log`""

# 1638 = another version of this product is already installed.
# Uninstall the old build by ProductCode, then retry.
if ($exitCode -eq 1638) {
    Add-Content -Path $result -Value 'msiexec 1638: old build present, uninstalling first'
    $uninst = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall' |
        ForEach-Object { Get-ItemProperty $_.PSPath } |
        Where-Object { $_.DisplayName -like 'Lunch Menu Publisher*' } |
        Select-Object -First 1
    if ($uninst -and $uninst.PSChildName -match '^\{.*\}$') {
        $code = Invoke-Msi "/x $($uninst.PSChildName) /qn /norestart"
        Add-Content -Path $result -Value "uninstall old exit: $code"
        Start-Sleep -Seconds 2
        $exitCode = Invoke-Msi "/i `"$msi`" /qn /norestart /l*v `"$log`""
    }
}

# --- 2. Verify ----------------------------------------------------------
$after = if (Test-Path $exe) { (Get-Item $exe).LastWriteTime.ToString('s') } else { 'not-installed' }
$ver   = if (Test-Path $exe) { (Get-Item $exe).VersionInfo.FileVersion } else { 'n/a' }
Add-Content -Path $result -Value "install exit: $exitCode"
Add-Content -Path $result -Value "exe after: $after"
Add-Content -Path $result -Value "exe version: $ver"

# Data folders must still exist after install - report explicitly.
$dataStillThere = @(Get-ChildItem 'C:\Users' -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'AppData\Roaming\com.school.lunchmenu') }).Count
Add-Content -Path $result -Value "data folders present after install: $dataStillThere"

if ($exitCode -eq 0 -or $exitCode -eq 3010) {
    Add-Content -Path $result -Value 'RESULT: SUCCESS'
} else {
    Add-Content -Path $result -Value "RESULT: FAILED (see $log)"
}
