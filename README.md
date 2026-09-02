# Lunch Menu Publisher

A Windows desktop app for building and publishing a school's monthly lunch
menu from a single **Publish Month** button. Built with plain HTML/CSS/JS on
the frontend and Rust + Tauri v2 on the backend. Everything is stored
locally and works offline.

Each month you:

1. Open the month and build the menu.
2. Drag reusable tiles (entrées, sides, specials, events) onto the calendar.
3. Mark **NO SCHOOL** days.
4. Check that instructional days have an entrée (the app highlights missing ones).
5. Press **Publish Month**.
6. Review the confirmation, then publish.

**Publish Month** produces everything at once:

- `Lunch Menu - <Month> <Year>.pdf` — a print-ready PDF in your Downloads folder
- `Lunch Menu - <Month> <Year>.txt` — plain-text export for FACTS / RenWeb import
- `menu.json` — machine-readable feed (V5 contract) written to the Google
  Drive-synced folder, consumed by the lunch spreadsheet's 6 AM sync and the
  kiosk display
- An email to the staff office with the TXT (and optionally PDF) attached

## Requirements

- Node.js 18+
- Rust (stable) with the Tauri v2 prerequisites for Windows
  (see https://tauri.app/start/prerequisites/)

## Getting started

```bash
npm install        # also copies jsPDF + html2canvas into js/vendor/
npm run dev        # run the Tauri app in development mode
```

For browser-only development without the Tauri backend:

```bash
npm run dev:server # serve the frontend at http://localhost:1420
```

In browser mode the app falls back to browser downloads instead of the
desktop file/email commands.

## Testing

```bash
npm test                     # frontend logic (node --test), 15 tests
cd src-tauri && cargo test   # backend validators + atomic writes, 10 tests
```

## Building an installer

```bash
npm run build   # runs scripts/sync-dist.js, then `tauri build`
```

The MSI lands in `src-tauri/target/release/bundle/msi/`. Use
`backup-installer.bat` to snapshot the previous installer before a new build
overwrites it, so you can always roll back.

## Repository layout

| Path | Purpose |
|---|---|
| `index.html`, `css/`, `js/` | Frontend source (no framework, no build step) |
| `js/vendor/` | jsPDF + html2canvas UMD bundles, copied from node_modules by `npm install` |
| `scripts/copy-vendor.js` | Copies vendor bundles from node_modules (postinstall) |
| `scripts/sync-dist.js` | Rebuilds `dist/` from source; runs as Tauri's `beforeBuildCommand` |
| `src-tauri/` | Rust backend: file writes, menu.json validation, SMTP email |
| `data/` | Curated verse data and the KJV text used for the verse feature |
| `fonts/` | Self-hosted fonts (no external font hosts) |
| `dist/` | Committed frontend bundle embedded in built apps |
| `tests/` | Frontend test suite |

## Documentation

- [USER_README.md](USER_README.md) — the day-to-day user guide
- [MENU_JSON.md](MENU_JSON.md) — the `menu.json` V5 contract for consumers
- [CONSUMER_UPDATE_V5.md](CONSUMER_UPDATE_V5.md) — hand-off brief for updating
  the external consumers (spreadsheet sync + kiosk) from V4 to V5
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the app is wired together

## Security notes

- No secrets in the repo: SMTP settings are user-entered and stored only in
  the app's local storage on each machine.
- The Tauri CSP is locked down; fonts and all assets are served locally.
