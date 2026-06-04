# Settings

Settings are accessed via a gear (⚙) icon in the header.

## Available Settings

- **Enable compact (3‑column) grid when opposite panel collapsed**: Toggles compact tile layout mode
- **Show verses on PDF**: Toggle Bible verse display in PDF exports
- **Enable advanced verse lookup**: Toggle full KJV Bible chapter/verse selection (vs. curated list only)
- **PDF Email Recipient**: Input field for default PDF email recipient
- **TXT Email Recipient**: Input field for default TXT email recipient
- **Export All Data**: Downloads a complete JSON backup of all menus, tiles, settings, and email recipients
- **Import Data**: Restores from a previously exported JSON backup file; validates structure before acceptance

## Design Principles

- Settings must be minimal and non‑destructive
- Changes auto-save immediately on toggle/input change
- Persistence failures roll back in-memory state to prevent data divergence
- Null-guarded: missing DOM elements silently skip listener attachment rather than crashing
``