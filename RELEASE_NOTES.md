# Release Notes — v1.0.0

## Overview

**Lunch Menu Publisher** is a professional desktop application for schools to create, manage, and publish monthly lunch menus. This v1.0.0 release represents a stable, feature-complete foundation with offline-first operation, warm print-ready PDF output, and automated email delivery.

---

## Features

### Menu Creation
- **Monthly Calendar View** — Landscape-oriented calendar grid optimized for printing
- **Drag-and-Drop Tiles** — Reusable entrée, side, special, and special-event panels
- **Inline Editing** — Add new menu items directly in panels without disruptive popups
- **NO SCHOOL Management** — Toggle any weekday as a non-school day with a single click

### Content & Design
- **Bible Verse Integration** — Display curated or custom KJV verses on the monthly menu
- **Warm PDF Palette** — Burgundy, gold, and cream print design with school logo header
- **Daily Milk Display** — Milk appears automatically as a staple on every school day
- **Special Event Highlighting** — Gold left border for events like bake sales or grandparents' day

### Export & Delivery
- **Print-Ready PDF** — Single-page, landscape PDF output via CSS print media
- **Text Export** — Plain-text export for any school information system
- **Email Integration** — Desktop app emails TXT exports directly via SMTP (Tauri backend)
- **Data Backup & Restore** — Full JSON export/import of all menus, tiles, and settings

### Quality & Performance
- **Offline-First** — All data local; zero cloud dependencies
- **Lazy-Loaded Bible Data** — The ~4.3 MB KJV JSON only loads when the Advanced verse tab is opened
- **Script Defer** — Non-blocking HTML parsing for faster startup
- **Missing Entrée Safeguard** — Orange pulse animation highlights school days without an entrée
- **Persistence Rollback** — If localStorage fails, in-memory state is automatically reverted

---

## Requirements

### Desktop App (Tauri)
- Node.js (LTS) and Rust (stable)
- `src-tauri/.env` file with `EMAIL_USER`, `EMAIL_PASSWORD`, `SMTP_HOST`, and `SMTP_PORT` for email functionality

### Web Version
- Any modern browser with localStorage support
- Email exports fall back to `mailto:` links (no SMTP backend)

---

## Contributors

Christian School

---

**Full Changelog**: [v1.0.0](https://github.com/Mixj73IT/Lunch-Menu-Publisher/releases/tag/v1.0.0)
