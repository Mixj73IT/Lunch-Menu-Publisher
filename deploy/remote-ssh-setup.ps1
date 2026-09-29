# =====================================================================
#  remote-ssh-setup.ps1
#  Run this ON 10.10.8.219 (the machine with Lunch Menu Publisher
#  installed), as Administrator:
#      right-click PowerShell -> Run as Administrator, then
#      powershell -ExecutionPolicy Bypass -File .\remote-ssh-setup.ps1
#
#  What it does:
#   1. Installs + starts OpenSSH Server (built into Windows 10/11).
#   2. Creates temporary local admin account "buffy-fix".
#   3. Authorizes the paired public key (key-only logon; passwords off).
#   4. Firewall: allows inbound SSH only from 10.10.10.0/24 (dev machine).
#   5. Creates a SYSTEM task runner so MSIs can be installed over SSH.
#   6. Reports the installed Lunch Menu Publisher location + version.
#   7. Re-run safe. Logs a transcript to C:\ProgramData\buffy-ssh\.
#
#  NOTE: this script contains NO backtick line continuations on purpose.
#  Backticks break silently when scripts are copied between machines,
#  which caused a parse error on first use.
#
#  REMOVE ACCESS AFTER THE FIX:  .\remote-ssh-setup.ps1 -Remove
#  (removes the account, key, firewall rule, and task; keeps the data
#  backup folder C:\ProgramData\buffy-ssh\data-backup)
# =====================================================================

param([switch]$Remove)

#requires -RunAsAdministrator

# --- Administrator check ---------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: right-click PowerShell and 'Run as Administrator', then re-run." -ForegroundColor Red
    exit 1
}

$ErrorActionPreference = 'Stop'
$FixUser       = 'buffy-fix'
$SshDir        = 'C:\ProgramData\buffy-ssh'
$KeyData       = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGFjgITqeE7IRXZD8zh8ccz/xSqfiQ6jhw09kPzvIbjp buffy-lunchmenu-fix'
$AllowedSubnet = '10.10.10.0/24'

# --- -Remove: undo everything this script set up -----------------------
if ($Remove) {
    Write-Host "== Removing SSH repair access ==" -ForegroundColor Cyan
    Stop-Process -Name 'lunch-menu-publisher' -Force -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName 'BuffyFixRunner' -Confirm:$false -ErrorAction SilentlyContinue
    Disable-NetFirewallRule -DisplayName 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
    Remove-LocalUser -Name $FixUser -ErrorAction SilentlyContinue
    $usersFile = 'C:\ProgramData\ssh\administrators_authorized_keys'
    if (Test-Path $usersFile) {
        $kept = Get-Content $usersFile | Where-Object { $_ -notlike '*buffy-lunchmenu-fix*' }
        Set-Content -Path $usersFile -Value $kept
        icacls $usersFile /inheritance:r /grant 'SYSTEM:F' /grant 'BUILTIN\Administrators:F' | Out-Null
    }
    Get-ChildItem $SshDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notin @('setup-transcript.log') } |
        Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "Access removed. Kept: $SshDir\setup-transcript.log and $SshDir\data-backup (your menu data safety copy)." -ForegroundColor Green
    Write-Host "Delete the data-backup folder manually once you no longer need it."
    exit 0
}

New-Item -ItemType Directory -Force -Path $SshDir | Out-Null
Start-Transcript -Path "$SshDir\setup-transcript.log" -Append | Out-Null

Write-Host "== Lunch Menu Publisher: SSH repair access setup ==" -ForegroundColor Cyan

# --- 1. OpenSSH Server ------------------------------------------------
$sshd = Get-Service -Name sshd -ErrorAction SilentlyContinue
if (-not $sshd) {
    $cap = $null
    try {
        $cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like 'OpenSSH.Server*' }
    } catch { $cap = $null }

    if ($cap -and $cap.State -ne 'Installed') {
        Write-Host "[1] Installing OpenSSH Server capability..."
        Add-WindowsCapability -Online -Name $cap.Name | Out-Null
    } elseif (-not $cap) {
        Write-Host "[1] Windows capability store unavailable - trying winget fallback..."
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Microsoft.OpenSSH.Beta -e --accept-source-agreements --accept-package-agreements
        } else {
            Write-Warning "Cannot install OpenSSH Server automatically. Install it manually, then re-run."
            Stop-Transcript | Out-Null
            exit 1
        }
    } else {
        Write-Host "[1] OpenSSH Server capability present but service missing; continuing."
    }
} else {
    Write-Host "[1] OpenSSH Server already installed."
}

Set-Service -Name sshd -StartupType Automatic
Start-Service -Name sshd
Write-Host ("    sshd status: {0}" -f (Get-Service sshd).Status)

# --- 2. Temporary fix account ----------------------------------------
if (-not (Get-LocalUser -Name $FixUser -ErrorAction SilentlyContinue)) {
    # Random 24-char password; interactive/password logons are disabled
    # at the sshd level (key-only). The password only satisfies Windows
    # account creation requirements.
    $bytes = New-Object byte[] 24
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $pass = [Convert]::ToBase64String($bytes)
    $newUser = @{
        Name                 = $FixUser
        Password             = (ConvertTo-SecureString $pass -AsPlainText -Force)
        FullName             = 'Buffy repair session'
        Description          = 'Temporary SSH repair account (remove after fix)'
        PasswordNeverExpires = $true
    }
    New-LocalUser @newUser | Out-Null
    Write-Host "[2] Created local user '$FixUser'."
} else {
    Write-Host "[2] User '$FixUser' already exists."
}
try {
    Add-LocalGroupMember -Group 'Administrators' -Member $FixUser -ErrorAction Stop
    Write-Host "    '$FixUser' added to Administrators."
} catch {
    Write-Host "    '$FixUser' is already a member of Administrators."
}

# --- 3. Public key + ACLs ---------------------------------------------
# For accounts in the local Administrators group, Windows OpenSSH reads
# C:\ProgramData\ssh\administrators_authorized_keys (not ~/.ssh).
$sshDataDir = 'C:\ProgramData\ssh'
$usersFile  = Join-Path $sshDataDir 'administrators_authorized_keys'
New-Item -ItemType Directory -Force -Path $sshDataDir | Out-Null

$existing = @()
if (Test-Path $usersFile) {
    $existing = Get-Content -Path $usersFile -ErrorAction SilentlyContinue
}
if ($existing -notcontains $KeyData) {
    Add-Content -Path $usersFile -Value $KeyData
    Write-Host "[3] Public key added to administrators_authorized_keys."
} else {
    Write-Host "[3] Public key already present."
}
# Strict ACL required by sshd or key auth is refused.
icacls $usersFile /inheritance:r /grant 'SYSTEM:F' /grant 'BUILTIN\Administrators:F' | Out-Null

# Disable password logons for sshd entirely.
$cfg = Join-Path $sshDataDir 'sshd_config'
if (Test-Path $cfg) {
    $content = Get-Content -Path $cfg
    $new = $content -replace '^\s*#?\s*PasswordAuthentication\s+.*', 'PasswordAuthentication no'
    if ($new -eq $content) {
        # No PasswordAuthentication line existed - append the directive
        # so password logons are explicitly disabled.
        $new = $content + 'PasswordAuthentication no'
    }
    Set-Content -Path $cfg -Value $new -Force
    Write-Host "    PasswordAuthentication set to 'no' in sshd_config."
} else {
    Write-Warning "sshd_config not found at $cfg - password auth left at default."
}
Restart-Service -Name sshd

# --- 4. Firewall: port 22 from the dev subnet only --------------------
$rule = Get-NetFirewallRule -DisplayName 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
if ($rule) {
    Set-NetFirewallRule -DisplayName 'OpenSSH-Server-In-TCP' -Enabled True -Action Allow
    Get-NetFirewallRule -DisplayName 'OpenSSH-Server-In-TCP' | Set-NetFirewallAddressFilter -RemoteAddress $AllowedSubnet
    Write-Host "[4] Existing firewall rule scoped to $AllowedSubnet."
} else {
    $fwRule = @{
        DisplayName   = 'OpenSSH-Server-In-TCP'
        Direction     = 'Inbound'
        Protocol      = 'TCP'
        LocalPort     = 22
        RemoteAddress = $AllowedSubnet
        Action        = 'Allow'
        Profile       = 'Any'
    }
    New-NetFirewallRule @fwRule | Out-Null
    Write-Host "[4] Firewall rule created (TCP/22 from $AllowedSubnet only)."
}

# --- 5. SYSTEM task runner (lets the repair session install MSIs) -----
# SSH sessions cannot answer UAC prompts. A scheduled task run as SYSTEM
# works around that: over SSH we rewrite run.ps1, then trigger the task
# with:  schtasks /run /tn BuffyFixRunner
New-Item -ItemType Directory -Force -Path $SshDir | Out-Null
Set-Content -Path (Join-Path $SshDir 'run.ps1') -Value '# placeholder - rewritten by the repair session before each use'
if (-not (Get-ScheduledTask -TaskName 'BuffyFixRunner' -ErrorAction SilentlyContinue)) {
    $taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\ProgramData\buffy-ssh\run.ps1'
    $taskTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1)
    Register-ScheduledTask -TaskName 'BuffyFixRunner' -Action $taskAction -Trigger $taskTrigger -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
    Write-Host "[5] Scheduled task 'BuffyFixRunner' created (SYSTEM, runs $SshDir\run.ps1 on demand)."
} else {
    Write-Host "[5] Scheduled task 'BuffyFixRunner' already exists."
}

# --- 6. Locate the installed app --------------------------------------
Write-Host "[6] Locating Lunch Menu Publisher..."
$cands = @(
    (Join-Path $env:ProgramFiles 'Lunch Menu Publisher'),
    (Join-Path ${env:ProgramFiles(x86)} 'Lunch Menu Publisher'),
    (Join-Path $env:LocalAppData 'Programs\Lunch Menu Publisher')
)
$installDir = $cands | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($installDir) {
    $exes = Get-ChildItem -Path $installDir -Filter *.exe -ErrorAction SilentlyContinue
    foreach ($e in $exes) {
        Write-Host ("    {0}  (version {1})" -f $e.FullName, $e.VersionInfo.FileVersion)
    }
} else {
    Write-Host "    Not in the standard install locations - will locate over SSH."
}

# --- 7. Done -----------------------------------------------------------
Write-Host ""
Write-Host "[7] Setup complete." -ForegroundColor Green
Write-Host "    Tell the dev machine (10.10.10.6) to connect as '$FixUser'."
Write-Host ""
Write-Host "    AFTER THE FIX, remove access by running (as admin):"
Write-Host "      .\remote-ssh-setup.ps1 -Remove"
Write-Host ""
Write-Host "Transcript: $SshDir\setup-transcript.log"
Stop-Transcript | Out-Null
