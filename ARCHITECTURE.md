# Architecture

A short map of how Lunch Menu Publisher is put together.

## Big picture

Two layers, no framework:

- **Frontend** — plain HTML/CSS/JS in `index.html`, `css/`, `js/`. Rendered
  in the Tauri webview in desktop mode, or any static server in browser
  mode.
- **Backend** — Rust (`src-tauri/`) exposing a handful of Tauri v2 commands:
  atomic file writes, `menu.json` validation, and SMTP email. The frontend
  never touches the disk or network directly in desktop mode.

## Frontend modules (`js/`)

| Module | Responsibility |
|---|---|
| `app.js` | Entry point; initializes everything, preview mode, keyboard shortcuts |
| `state.js` | `State` — single source of truth. Persists settings (school name, staff email, SMTP, menu.json folder) to `localStorage` under `lunchMenu_*` keys; handles legacy-key migration |
| `tiles.js` | Reusable menu tiles (entrées, sides, specials, events) |
| `calendar.js` | Month grid, day tiles, NO SCHOOL marks, missing-entrée highlighting |
| `editing.js` | Day-editor dialog wiring |
| `verses.js` | Verse selector; lazy-loads the KJV data only when the Advanced tab opens |
| `menu-data.js` | `MenuData` — pure builders: TXT export, `buildMenuJson` (V5 contract), `buildPublishPlan`, `buildVerdict` |
| `publish.js` | `Publish` — orchestrates Publish Month: builds the plan, shows the confirmation, calls the backend, renders the verdict banner |
| `pdf-export.js` | `PdfExport` — jsPDF + html2canvas print-ready PDF |
| `settings.js` | Settings dialog |

`js/vendor/` holds the jsPDF and html2canvas UMD bundles, copied from
`node_modules` by `scripts/copy-vendor.js` on `npm install` — node_modules is
the single source of truth for their versions.

## Tauri bridge

Tauri v2 exposes `invoke` under `__TAURI__.core.invoke`; the frontend aliases
it to the v1-style `window.__TAURI__.invoke` so the rest of the code stays
simple. Commands with multi-word argument names use
`#[tauri::command(rename_all = "snake_case")]` to match the frontend payloads.

Backend commands (`src-tauri/src/main.rs`):

- `write_output_file` — atomic write of the PDF/TXT to Downloads
- `write_menu_json` — atomic write of `menu.json` to the configured folder
- `send_publish_email` — SMTP via `lettre`, with TXT/PDF attachments
- `validate_menu_json` — enforces the V5 contract before writing
- `*_to_dir` variants — same writes to an arbitrary directory (used by tests)

## Publish Month flow

1. `MenuData.buildPublishPlan(...)` computes what will be produced: PDF, TXT,
   `menu.json` (V5: primary month + the following month, so an early publish
   of next month never erases the rest of the current one), email, and any
   warnings (missing entrées, incomplete SMTP, unconfigured destinations).
2. The user confirms; `Publish` invokes the backend commands.
3. `MenuData.buildVerdict(...)` classifies the result as complete, partial,
   or failed; "Published" is marked only on a complete publish.

`menu.json` consumers look entries up by `date` (see MENU_JSON.md), so the
extra next-month entries are ignored until their dates arrive. The contract
is documented in `MENU_JSON.md`, and `CONSUMER_UPDATE_V5.md` is the migration
brief for the external consumers (spreadsheet sync + kiosk).

## Build pipeline

- `npm run copy:vendor` → fills `js/vendor/` from node_modules (postinstall).
- `scripts/sync-dist.js` (Tauri `beforeBuildCommand`) → rebuilds `dist/`
  from scratch so every build embeds a fresh, self-consistent frontend; the
  old one-line PowerShell command was a silent no-op and let stale bundles
  ship.
- `npm run build` → `tauri build`, producing the MSI installer.

## Offline by design

Fonts are self-hosted (`fonts/`, no external font hosts), the CSP in
`tauri.conf.json` blocks remote sources, and all data lives on the user's
machine. SMTP settings are user-entered per machine and never leave it.

## Testing

- Frontend: `npm test` (node's built-in test runner) — publish planning,
  V5 JSON building, verdict classification.
- Backend: `cargo test` in `src-tauri/` — menu.json V5 validation (including
  December rollover), atomic write behavior, filename rules.
