# Deploying Lunch Menu Publisher

How to build a correct installer and roll it out to a school machine over SSH.
This workflow was built during the "PDF creation says files are missing"
incident (2026-09): the installed MSI had been built without the vendored PDF
libraries, and because Tauri embeds the frontend into the exe at build time,
nothing on the target machine can be patched — the fix is always a rebuilt MSI.

## 0. Where things live

| What | Where | Notes |
|---|---|---|
| Program files | `C:\Program Files\Lunch Menu Publisher\` | Replaced by every MSI install |
| Menu/settings data | `C:\Users\<user>\AppData\Local\com.school.lunchmenu\` | WebView2 localStorage; the MSI never touches it |
| PDF vendor bundles | `js/vendor/` (from `npm install`) | NOT committed; copied from node_modules by `scripts/copy-vendor.js` |
| Installer output | `src-tauri/target/release/bundle/msi/*.msi` | Produced by `npm run build` |

## 1. Build (dev machine)

```
npm install      # restores js/vendor via the postinstall hook
npm test         # 18 tests; includes the sync-dist guard
npm run build    # fails loudly if js/vendor is missing (build guard)
```

The guard in `scripts/sync-dist.js` exists because a build made without
`npm install` used to ship an app whose PDF generation reported
"missing components" — and only became visible on the school machine.
Verify the build before shipping:

```powershell
$exe = "src-tauri\target\release\lunch-menu-publisher.exe"
$ascii = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($exe))
$ascii.Contains("jspdf.umd.min.js") -and $ascii.Contains("html2canvas.min.js")   # must be True
```

## 2. One-time SSH access on the target machine

Copy `deploy\remote-ssh-setup.ps1` to the target and run as Administrator:

```
powershell -ExecutionPolicy Bypass -File .\remote-ssh-setup.ps1
```

It installs/starts OpenSSH Server, creates temporary local admin `buffy-fix`
(key-only; password logons disabled), opens TCP/22 only to the dev subnet
`10.10.10.0/24`, registers the `BuffyFixRunner` SYSTEM task (so MSI installs
are not blocked by UAC), and prints the installed app's location and version.
Re-run safe; transcript goes to `C:\ProgramData\buffy-ssh\`.

The matching private key lives on the dev machine in the Freebuff worktree at
`.freebuff/ssh/lunchfix_ed25519` (not committed — treat it as a credential).

## 3. Deploy over SSH (dev machine)

The scripts in `deploy/` run remotely in this order:

| Script | Runs as | Purpose |
|---|---|---|
| `remote-backup.ps1` | buffy-fix | Robocopy the WebView2 data folder to `C:\ProgramData\buffy-ssh\data-backup\<user>_<stamp>` |
| `remote-run.ps1` (as `incoming-run.ps1`) | SYSTEM (task) | Stop app, back up data, install MSI; uninstalls the old build first on msiexec 1638; verifies |
| `remote-install-trigger.ps1` (as `incoming-trigger.ps1`) | buffy-fix | Copies run.ps1 into place, `schtasks /run /tn BuffyFixRunner`, polls the result |
| `remote-verify.ps1` | buffy-fix | Data folders present, PDF bundles inside the installed exe, version |
| `remote-smoke.ps1` | buffy-fix | Launch the app, confirm it survives 12 s, close it |

```
scp -i .freebuff/ssh/lunchfix_ed25519 "src-tauri/target/release/bundle/msi/Lunch Menu Publisher_1.0.1_x64_en-US.msi" 'buffy-fix@<TARGET>:C:/ProgramData/buffy-ssh/LunchMenuFix.msi'
scp -i .freebuff/ssh/lunchfix_ed25519 deploy/remote-run.ps1 'buffy-fix@<TARGET>:C:/ProgramData/buffy-ssh/incoming-run.ps1'
scp -i .freebuff/ssh/lunchfix_ed25519 deploy/remote-install-trigger.ps1 'buffy-fix@<TARGET>:C:/ProgramData/buffy-ssh/incoming-trigger.ps1'
ssh -i .freebuff/ssh/lunchfix_ed25519 buffy-fix@<TARGET> powershell -NoProfile -ExecutionPolicy Bypass -File C:\ProgramData\buffy-ssh\incoming-trigger.ps1
```

Prefer shipping remote scripts as files (scp + `-File`) over inline
`powershell -Command` quoting — inline escaping through cmd.exe is what broke
several one-liners during the incident.

## 4. Verify, then remove access

On the dev machine run `remote-verify.ps1` and `remote-smoke.ps1` as above;
then have the user do a real Publish Month and confirm the PDF line shows ✓.

On the target machine, revoke everything:

```
powershell -ExecutionPolicy Bypass -File .\remote-ssh-setup.ps1 -Remove
```

That removes the account, the authorized key, the firewall rule, and the task.
It deliberately keeps `data-backup\` and the transcript; delete them manually
once the new build has been confirmed working.
