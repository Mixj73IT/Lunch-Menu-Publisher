<p align="center">
  <img src="images/icon.svg" alt="Lunch Menu Publisher logo" width="120" height="120">
</p>

<h1 align="center">Lunch Menu Publisher</h1>

<p align="center">
  A simple, dependable desktop app for creating and publishing one school lunch menu per month.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/built%20with-Tauri-FFC131?logo=tauri" alt="Tauri"></a>
</p>

## Overview

**Lunch Menu Publisher** is a local-first Tauri desktop app for one person
creating one school lunch menu per month. It turns a monthly menu into the
required outputs with a single **Publish Month** action:

1. **PDF** — `Lunch Menu - September 2026.pdf`, saved to Downloads
2. **SIS TXT** — `Lunch Menu - September 2026.txt` for FACTS / RenWeb import, saved to Downloads
3. **menu.json** — a stable machine-readable snapshot written to a configured
   Google Drive-synced folder (atomic replace, no history)
4. **Staff-office email** — TXT always attached, PDF attached when generated

Everything stays on the user's machine. No accounts, no cloud API, no
collaboration, no archive system.

---

## Features

### Menu creation
- **Monthly calendar view** — the landscape print design, preserved
- **Drag-and-drop tiles** — reusable entrée, side, specials, and event tiles
- **Inline editing** — click a day and type `Entree | Sides | Special | Event`
- **NO SCHOOL days** — one-click toggle; weekends are always non-school
- **Milk** — displayed automatically on every school day (fixed staple)
- **Specials** — labeled "Specials", with helper text explaining they are for
  **teachers & 12th-grade students** (in the panel, the preview, and the PDF)
- **Missing-entrée safeguard** — instructional days without an entrée pulse
  orange

### Publish Month (one button)
- **Confirmation checklist** — month/year, missing-entrée count, and exactly
  what will be produced (PDF, TXT, `menu.json`, email)
- **Honest results** — every output reports its own success/failure; the final
  result distinguishes complete, partial, and failed publishes
- **Cancel-safe** — nothing happens until you confirm
- **✓ Published badge** on the month once published

### Integration
- **menu.json schema v1** — documented in [MENU_JSON.md](MENU_JSON.md);
  written atomically (temp file + rename) so downstream projects never read
  partial JSON; each publish replaces the previous file
- **PDF** — generated client-side with jsPDF + html2canvas, mirroring the
  print design; falls back to an honest **Preview → Print → Save as PDF** step
- **Email** — SMTP (implicit TLS on 465, STARTTLS otherwise) with a single
  staff-office recipient; test connection + test email in Settings

### Usability
- **Undo** (`Ctrl+Z`), **autosave** to localStorage, collapsible panels
- **Settings** simplified around the workflow: staff email, menu.json folder
  picker, email status, verse options, compact grid, backup/restore

---

## Quick Start (desktop app)

1. **Install** — see [README-PACKAGING.md](README-PACKAGING.md)
2. **Set up once** — Settings: staff-office email + SMTP credentials, and
   **Choose Folder…** for the menu.json destination (a Google Drive-synced
   folder). See [USER_README.md](USER_README.md) §2.
3. **Build the menu** — navigate months, drag tiles onto days, mark NO SCHOOL
4. **Publish** — click **Publish Month**, review the checklist, confirm
5. **Done** — PDF + TXT in Downloads, `menu.json` synced to Google Drive,
   and the staff-office email reported as sent (when configured).

---

## Project Structure

```
├── css/
│   ├── app.css          # Application + preview styles
│   ├── pdf.css          # Print / PDF styles
│   └── fonts.css        # Offline font-face declarations
├── data/
│   ├── curated-verses.json
│   └── kjv-bible.json
├── js/
│   ├── app.js           # Initialization, preview mode, shortcuts
│   ├── calendar.js      # Calendar rendering & interaction
│   ├── editing.js       # Day-cell inline editing
│   ├── menu-data.js     # PURE data layer: menu.json schema, TXT, validation
│   ├── pdf-export.js    # Real PDF generation (jsPDF + html2canvas)
│   ├── publish.js       # Publish Month workflow (confirmation + execution)
│   ├── settings.js      # Settings modal & configuration
│   ├── state.js         # State management, localStorage, rollback
│   ├── tiles.js         # Tile rendering & drag-and-drop
│   ├── verses.js        # Verse selection & Bible data
│   └── vendor/          # jspdf + html2canvas (copied by npm install)
├── scripts/
│   ├── copy-vendor.js   # Copies PDF libs into js/vendor
│   └── generate-icon.py
├── src-tauri/
│   ├── src/main.rs      # Rust backend: SMTP, folder picker, atomic writes
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/
│   └── menu-data.test.js # Unit tests (Node built-in runner)
├── index.html
└── package.json
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [USER_README.md](USER_README.md) | End-user guide: workflow + setup steps |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Architecture, backend commands, tests, build |
| [MENU_JSON.md](MENU_JSON.md) | **menu.json schema** for external consumers |
| [TEXT_EXPORT.md](TEXT_EXPORT.md) | Exact SIS text-export format |
| [PDF_DESIGN_INTENT.md](PDF_DESIGN_INTENT.md) | PDF visual design rationale |
| [SETTINGS_SPEC.md](SETTINGS_SPEC.md) | Settings modal specification |
| [VERSE_HANDLING.md](VERSE_HANDLING.md) | Verse selection logic & Bible data handling |
| [UX_CORE_RULES.md](UX_CORE_RULES.md) | UX design principles & constraints |
| [NO_SCHOOL_BEHAVIOR.md](NO_SCHOOL_BEHAVIOR.md) | NO SCHOOL day visual behavior |
| [README-PACKAGING.md](README-PACKAGING.md) | Packaging into a Windows installer |

---

## Development

```bash
npm install        # installs frontend deps AND copies PDF libs into js/vendor
npm run tauri dev  # run the desktop app in development
npm test           # unit tests (menu-data, schema, TXT, validation)
npm run tauri build
```

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for the full technical details:
Tauri commands, the atomic-write design, the `menu.json` schema, the email
flow, and testing.

---

## License

This project is licensed under the [MIT License](LICENSE).
