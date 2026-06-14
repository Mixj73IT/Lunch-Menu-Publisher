<p align="center">
  <img src="images/icon.svg" alt="Lunch Menu Publisher logo" width="120" height="120">
</p>

<h1 align="center">Lunch Menu Publisher</h1>

<p align="center">
  A professional desktop application for schools to create, manage, and publish monthly lunch menus.
</p>

<p align="center">
  <a href="https://github.com/yourusername/lunch-menu-publisher"><img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/built%20with-Tauri-FFC131?logo=tauri" alt="Tauri"></a>
</p>

## Overview

**Lunch Menu Publisher** is a cross-platform desktop application built for school cafeterias and food service managers. It streamlines the entire workflow of creating monthly lunch menus — from drag-and-drop menu assembly to warm, print-ready PDF output and automated email delivery.

Designed for **offline-first** operation, all data persists locally and nothing requires a cloud subscription.

---

## Features

### Menu Creation
- **Monthly Calendar View** — Visual, landscape-oriented calendar grid optimized for printing
- **Drag-and-Drop Tiles** — Organize entrées, sides, specials, and special events into reusable panels
- **Inline Editing** — Add new menu items directly in panels without disruptive popups
- **NO SCHOOL Management** — Toggle any weekday as a non-school day with a single click; visual pattern distinguishes weekends from weekdays

### Content & Design
- **Bible Verse Integration** — Display a curated or custom KJV verse on the monthly menu
- **Warm PDF Palette** — Burgundy, gold, and cream print design with school logo header
- **Daily Milk Display** — Milk appears automatically as a staple on every school day
- **Special Event Highlighting** — Gold left border draws attention to events like bake sales or grandparents' day

### Export & Delivery
- **Print-Ready PDF** — Single-page, landscape PDF output via CSS print media
- **FACTS Export** — Plain-text export compatible with FACTS school management systems
- **Email Integration** — Desktop app can email TXT exports directly via SMTP (Tauri backend)
- **Data Backup & Restore** — Full JSON export/import of all menus, tiles, and settings

### Usability
- **Undo System** — Press `Ctrl+Z` to undo calendar edits and tile changes
- **Autosave** — All changes persist automatically to localStorage
- **Collapsible Side Panels** — Maximize calendar space on smaller screens
- **Missing Entrée Safeguard** — Orange pulse animation highlights school days without an entrée

---

## Installation

### Desktop Application (Recommended)

The desktop app is built with **Tauri** and runs natively on Windows, macOS, and Linux.

**Requirements:**
- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://rustup.rs/) (stable)

**Build from source:**

```bash
# Clone the repository
git clone https://github.com/yourusername/lunch-menu-publisher.git
cd lunch-menu-publisher

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production installer
npm run tauri build
```

The Windows installer (`.msi`) will be located at:

```
src-tauri/target/release/bundle/msi/Lunch Menu Publisher_1.0.0_x64_en-US.msi
```

### Web Version

For quick browser access without installing:

```bash
# Serve the static files
npx serve dist

# Or with Python
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

> **Note:** The web version does not include SMTP email delivery (requires the Tauri backend). Email exports fall back to `mailto:` links.

---

## Quick Start

1. **Select a month** — Use the arrow buttons in the header
2. **Build your tile library** — Click the **+** button on any panel to add entrées, sides, or specials
3. **Populate the calendar** — Drag tiles onto day cells
4. **Add a verse** — Click **Select Verse** and choose from curated or the full KJV Bible
5. **Preview & print** — Click **Preview** to see the warm PDF layout, then print
6. **Export** — Use **FACTS Export** or **Email TXT** to share the menu

---

## Project Structure

```
lunch-menu-publisher/
├── css/
│   ├── app.css          # Main application styles
│   ├── pdf.css          # Print-specific / PDF styles
│   └── fonts.css        # Offline font-face declarations
├── data/
│   ├── curated-verses.json   # Pre-selected Bible verses
│   └── kjv-bible.json        # Full King James Bible (JSON)
├── js/
│   ├── app.js           # Application initialization
│   ├── calendar.js      # Calendar rendering & interaction
│   ├── editing.js       # Day-cell inline editing
│   ├── email-export.js  # Email export (Tauri invoke + mailto fallback)
│   ├── facts-export.js  # FACTS-compatible text export
│   ├── settings.js      # Settings modal & preferences
│   ├── state.js         # State management, localStorage, rollback
│   ├── tiles.js         # Tile rendering & drag-and-drop
│   └── verses.js        # Verse selection & Bible data
├── src-tauri/
│   ├── src/main.rs      # Rust backend (SMTP email command)
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri window & bundle config
├── dist/                # Static build output (mirrors root)
├── index.html           # Main HTML entry
└── package.json         # Node.js scripts & devDependencies
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Full technical architecture, backend integration, and build instructions |
| [USER_README.md](USER_README.md) | End-user guide for cafeteria managers |
| [README-PACKAGING.md](README-PACKAGING.md) | Packaging the app into a Windows installer |
| [FACTS_EXPORT.md](FACTS_EXPORT.md) | FACTS export format specification |
| [PDF_DESIGN_INTENT.md](PDF_DESIGN_INTENT.md) | PDF visual design rationale |
| [SETTINGS_SPEC.md](SETTINGS_SPEC.md) | Settings modal specification |
| [VERSE_HANDLING.md](VERSE_HANDLING.md) | Verse selection logic & Bible data handling |
| [UX_CORE_RULES.md](UX_CORE_RULES.md) | UX design principles & constraints |
| [NO_SCHOOL_BEHAVIOR.md](NO_SCHOOL_BEHAVIOR.md) | NO SCHOOL day visual behavior |

---

## Development

### Code Patterns

The JavaScript codebase follows a defensive, vanilla-JS style:

- **Null-guarded DOM access** — Every `getElementById` is checked before attaching listeners
- **Persistence rollback** — If `localStorage` fails (e.g., quota exceeded), in-memory state is reverted to the previous snapshot
- **Shared constants** — `TileTypes` and `GridIds` frozen objects eliminate magic strings across modules
- **Inline add input** — New tiles are added via an inline text field (no `prompt()` popups, which are unsupported in Tauri)

### State Architecture

All application state is stored in `localStorage` with the following keys:

| Key | Description |
|-----|-------------|
| `lunchMenu_entreeTiles` | Ordered array of entrée tile objects |
| `lunchMenu_sideTiles` | Ordered array of side tile objects |
| `lunchMenu_specialsTiles` | Specials (extra-purchase) tiles |
| `lunchMenu_specialEventTiles` | Special event tiles |
| `lunchMenu_menus` | Monthly menu data (day → { entrée, sides, specials, specialEvent, noSchool }) |
| `lunchMenu_settings` | Application settings object |
| `lunchMenu_currentMonth` | Currently selected month index |
| `lunchMenu_pdfEmail` | Default PDF email recipient |
| `lunchMenu_txtEmail` | Default TXT email recipient |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Support

For bug reports or feature requests, please open an issue on the project repository.
