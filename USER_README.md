# Lunch Menu Publisher: User Guide

## 1. Overview

Welcome to the **Lunch Menu Publisher**! This desktop app helps you create one
monthly school lunch menu and publish it — all from one button. Everything is
stored locally on your computer and works offline.

Each month you:

1. Open the month and build the menu.
2. Drag reusable tiles (entrées, sides, specials, events) onto the calendar.
3. Mark **NO SCHOOL** days.
4. Check that instructional days have an entrée (the app highlights missing ones).
5. Press **Publish Month** — one button.
6. Review the confirmation, then publish.

**Publish Month** produces everything at once:

- `Lunch Menu - September 2026.pdf` — a print-ready PDF in your Downloads folder
- `Lunch Menu - September 2026.txt` — a plain-text file for FACTS / RenWeb import, also in Downloads
- `menu.json` — a machine-readable file written to your Google Drive-synced folder.
  It always covers **two months — the current month and the next one** — so
  publishing next month early never erases the rest of the current month.
- An email to the staff office with the TXT (and PDF) attached

You never need to remember a sequence of Preview, Print, Text Export, Email,
and backup steps again. Preview is still there if you want to look at the
printed design first.

## 2. One-time setup (do this once)

### 2.1 Staff-office email

1. Open **Settings** (gear icon, top right).
2. In **Staff-Office Email Recipient**, enter the office email address.
3. Enter the **SMTP Host**, **Port** (465 for implicit TLS, otherwise STARTTLS),
   **User**, and **Password** for the account that sends the email.
   Use an app-specific password from your email provider, not your main
   password. Credentials are stored only on this device.
4. Click **Test Connection** to verify the server accepts your credentials.
5. Click **Send Test Email** to confirm an email actually arrives.

### 2.2 menu.json destination folder (Google Drive)

1. In Settings, next to **menu.json Destination Folder**, click
   **Choose Folder…**.
2. Pick a folder inside your **Google Drive for Desktop** sync folder
   (for example `My Drive → Lunch Menu Data`).
3. The status line confirms the folder. Until one is chosen, Publish Month
   stays disabled — `menu.json` is a required output.

### 2.3 Verse and appearance (optional)

- **Show verses on PDF** — toggle the Bible verse on the printed menu.
- **Select Verse** (calendar header) — pick a curated verse for the month, or
  use Advanced lookup for any KJV passage.

## 3. Building the menu

- **Add items to panels**: click the **+** on a panel (Entrées, Sides,
  Specials, Special Events), type the name, press Enter.
- **Fill the calendar**: drag tiles onto day cells, or click a day and type
  `Entree | Side1, Side2 | Special | Event`.
- **Milk** appears automatically on every school day — it's a fixed staple.
- **Specials** are for **teachers and 12th-grade students** only. The panel
  and the printed menu say so.
- **NO SCHOOL**: click the **NS** button on a weekday to mark it. Weekends are
  always non-school days.
- **Missing entrée safeguard**: instructional days without an entrée pulse
  orange so you can spot them at a glance.
- **Undo**: `Ctrl+Z` undoes calendar edits; `Ctrl+←/→` moves between months.

## 4. Publishing the month

1. Click **Publish Month** (top right).
2. Review the confirmation — it shows the month/year, how many instructional
   days are missing an entrée, and what will happen to the PDF, TXT,
   `menu.json`, and the email.
3. Fix anything in **"Before you publish"** if needed, or just proceed.
4. Click **Publish Month**. Each output reports its own result, honestly.
   The final result is **complete** only when every step succeeds, **partial**
   when `menu.json` succeeds but another step fails, and **failed** when
   `menu.json` is not written.
5. A **✓ Published** badge appears next to the month name after a complete publish.

Re-publishing a month simply overwrites the previous PDF, TXT, and `menu.json`
— no history or archives are kept. `menu.json` always carries the current
month and the next month together, so the rest of the current month survives
when the next month is published early.

## 5. Troubleshooting

- **"menu.json was NOT written"**: the destination folder is unavailable or
  not writable. Choose a different folder in Settings and publish again.
- **Published with issues**: the files may be saved, but a configured email
  or PDF step failed. Review the checklist and retry after fixing the reported
  issue.
- **PDF not generated**: automatic PDF generation needs the app's components
  (`npm install` in the project). Use **Preview → Print → "Save as PDF"**
  instead — that always works.
- **No staff-office email configured**: the publish result is marked partial
  until a recipient and working SMTP settings are configured.
- **Menu data missing after reopening**: restore from a backup via Settings →
  **Import Data** (backups are made with **Export All Data**).
