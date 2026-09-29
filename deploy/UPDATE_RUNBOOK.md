# Update Runbook — deploying a new build to the school machine

One page, in order. Target: **FACULTY-0118** (`10.10.8.219`), app user
`micaelawhitis`. Run everything from the dev machine, from the Freebuff
worktree root. SSH access is intentionally kept for updates/troubleshooting.

## 0. Fixed facts

| Thing | Value |
|---|---|
| SSH account | `buffy-fix` (key-only; password logons disabled) |
| Private key | `.freebuff/ssh/lunchfix_ed25519` — **never delete, never commit** |
| Firewall scope | TCP/22 from `10.10.10.0/24` only |
| Task runner | `BuffyFixRunner` (SYSTEM) runs `C:\ProgramData\buffy-ssh\run.ps1` |
| Staging dir | `C:\ProgramData\buffy-ssh` on the target |
| App data (never touched by MSI) | `C:\Users\micaelawhitis\AppData\Local\com.school.lunchmenu` |

## 1. Build on the dev machine

```
npm install     # refresh js/vendor (build guard fails without it)
npm test        # all tests must pass
npm run build   # produces src-tauri/target/release/bundle/msi/*.msi
```

Bump the version first (`package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`) so `exe version` in the install result is proof
of the new build.

## 2. Sanity-check connectivity (5 seconds)

```
ssh -i .freebuff/ssh/lunchfix_ed25519 -o BatchMode=yes buffy-fix@10.10.8.219 "echo SSH-OK"
```

## 3. Ship the three files

```
scp -i .freebuff/ssh/lunchfix_ed25519 "<msi path>" 'buffy-fix@10.10.8.219:C:/ProgramData/buffy-ssh/LunchMenuFix.msi'
scp -i .freebuff/ssh/lunchfix_ed25519 deploy/remote-run.ps1 'buffy-fix@10.10.8.219:C:/ProgramData/buffy-ssh/incoming-run.ps1'
scp -i .freebuff/ssh/lunchfix_ed25519 deploy/remote-install-trigger.ps1 'buffy-fix@10.10.8.219:C:/ProgramData/buffy-ssh/incoming-trigger.ps1'
```

## 4. Trigger and watch

```
ssh -i .freebuff/ssh/lunchfix_ed25519 buffy-fix@10.10.8.219 powershell -NoProfile -ExecutionPolicy Bypass -File C:\ProgramData\buffy-ssh\incoming-trigger.ps1
```

Success looks like: `install exit: 0`, new `exe version`, `RESULT: SUCCESS`.
The run script stops the app, **backs up app data to
`C:\ProgramData\buffy-ssh\data-backup\`**, installs, and handles
msiexec 1638 (old-build-first uninstall) automatically.

## 5. Verify

- `deploy/remote-verify.ps1` → data folder present, version correct.
- `deploy/remote-smoke.ps1` → app launches and survives 12 s.
- Have the user do a real **Publish Month**; PDF/TXT/menu.json must all be ✓.

## 6. Rules learned the hard way

- **Ship scripts as files** (scp + `-File`), never inline `powershell -Command`
  — quoting through cmd.exe mangles `$`/quotes (multiple failures on 2026-09-28).
- **One retry loop per incident, not per hour**: repeated Google relay
  connections from the school IP trigger a `4.7.0` throttle for hours. The
  relay acceptance was proven with ONE full-message probe; use
  `deploy/remote-relay-status.ps1` (banner-only) to check, never blast sends.
- App data lives in WebView2 localStorage — MSI updates never touch it, but
  keep the pre-install backup step anyway.
- `desktop.ini` files are ignored by git; never let one into `.git/refs/`.

## 7. Rollback

Installers are versioned MSIs; the previous build can be re-shipped the same
way (its file lives under `src-tauri/target/release/bundle/msi/` until the
next build, or on the target in `C:\ProgramData\buffy-ssh\`). Data backups in
`data-backup\` restore via Settings → Import Data if ever needed.

## 8. Breaking access (only when intended)

On the target as admin: `powershell -ExecutionPolicy Bypass -File .\remote-ssh-setup.ps1 -Remove`
— removes the account, key, firewall rule, and task; keeps the data backup.
To restore access later, re-run the setup script from a fresh copy in
`deploy/remote-ssh-setup.ps1` (the public key is embedded in it; the private
key stays here).
