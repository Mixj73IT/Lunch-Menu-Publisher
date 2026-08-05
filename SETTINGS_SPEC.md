# Settings

Settings are accessed via the gear (⚙) icon in the header. Changes auto-save
immediately; persistence failures roll back in-memory state.

## Workflow settings

- **Staff-Office Email Recipient**: The single recipient for the Publish Month
  email (normally the school office). A status line shows whether email is
  ready or what is missing.
- **Email status**: Shows the configured recipient and whether SMTP is fully
  configured (`✓ Ready`), or lists the missing pieces (recipient, host, user,
  password).
- **SMTP Host / Port / User / Password**: Server credentials for sending email.
  Port `465` uses implicit TLS; other ports use STARTTLS. Stored locally only,
  never committed to source control.
- **Test Connection**: Opens a real SMTP connection to verify host/port/user/
  password (desktop app only).
- **Send Test Email**: Sends a short test email to the staff-office recipient
  to verify the full path end-to-end (desktop app only).

## menu.json destination

- **Choose Folder…**: Native folder picker (desktop app). The chosen folder is
  where `menu.json` is written on every Publish. Normally a Google Drive for
  Desktop synced folder.
- A status line shows the selected folder and confirms Publish Month is
  enabled. Publish Month stays disabled until a folder is chosen.

## Appearance & content

- **Enable compact (3-column) grid when opposite panel collapsed**: Toggles
  the compact tile layout.
- **Show verses on PDF**: Toggle Bible verse display in PDF/preview output.
- **Enable advanced verse lookup**: Toggle full KJV chapter/verse selection
  vs. the curated list only.

## Recovery tools (kept for backups)

- **Export All Data**: Downloads a complete JSON backup of menus, tiles,
  settings, and the email recipient (the SMTP password is intentionally
  excluded).
- **Import Data**: Restores from a previously exported backup; validates the
  structure before accepting it.

## Design principles

- Settings are minimal and non-destructive.
- All UI text reflects real behavior: no claims about features that don't work
  in the current environment.
