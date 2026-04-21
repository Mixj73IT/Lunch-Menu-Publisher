# Lunch Menu Publisher

A desktop application for Christian schools to create and manage monthly lunch menus with Bible verse displays, landscape calendar layout, NO SCHOOL day management, and email export functionality.

## Features

- **Monthly Calendar Creation**: Create lunch menus for each day of the month
- **Bible Verse Integration**: Select and display curated Bible verses or choose from the full KJV Bible
- **Landscape Calendar Layout**: Optimized landscape orientation for PDF printing
- **NO SCHOOL Day Management**: Mark weekdays as NO SCHOOL with visual indicators
- **Tile-Based Menu Items**: Drag and drop entree, side, and special event tiles
- **FACTS Export**: Generate text exports compatible with FACTS school management system
- **Email Export**: Send PDF and TXT exports via email with pre-filled recipients
- **Tauri Desktop App**: Cross-platform desktop application (Windows, macOS, Linux)
- **Web Version**: Browser-based version for quick access

## Installation

### Web Version

The web version can be run locally using a simple HTTP server:

```bash
# Using Python
python -m http.server 8080

# Then open http://localhost:8080 in your browser
```

### Desktop Application (Tauri)

The desktop application requires:
- Node.js (for web frontend)
- Rust/Cargo (for Tauri backend)

#### Building from Source

```bash
# Install dependencies
npm install

# Build the application
npm run build

# The installer will be in: src-tauri/target/release/bundle/msi/
```

#### Running in Development Mode

```bash
npm run dev
```

## Usage

### Creating a Lunch Menu

1. **Select Month**: Use the arrow buttons to navigate to the desired month
2. **Add Menu Items**:
   - Drag entree tiles from the Entrees panel
   - Drag side tiles from the Sides panel
   - Drag special event tiles from the Special Events panel
   - Drop tiles onto calendar day cells
3. **Add Bible Verse**:
   - Click the "Select Verse" button
   - Choose from curated verses or select from the full KJV Bible
   - The verse will display on the calendar
4. **Mark NO SCHOOL Days**:
   - Click the "NS" button on any weekday cell to toggle NO SCHOOL status
   - Weekday NO SCHOOL cells show text with light pattern
   - Weekend NO SCHOOL cells show only shading (no text)
5. **Preview & Export**:
   - Click "Preview" to see the print preview
   - Click "FACTS Export" to generate text for FACTS system
   - Click "Email PDF" or "Email TXT" to send via email

### Settings

Access settings by clicking the settings icon (⚙) in the header:

- **Enable 3-column tiles**: Compact tile layout when opposite panel is collapsed
- **Show verses on PDF**: Toggle verse display in PDF exports
- **Enable advanced verse lookup**: Allow selecting from full KJV Bible
- **PDF Email Recipient**: Default email address for PDF exports
- **TXT Email Recipient**: Default email address for TXT exports

### Email Export

The email export functionality:
1. Opens your default email client
2. Pre-fills the recipient (from Settings)
3. Pre-fills the subject line
4. Includes the content in the email body
5. **Note**: In the web version, you must manually attach the file. In the Tauri desktop app, file attachments are automatic.

## Project Structure

```
Lunch Program/
├── css/              # Stylesheets
│   ├── app.css      # Main application styles
│   └── pdf.css      # PDF/print-specific styles
├── data/             # Data files
│   ├── curated-verses.json  # Pre-selected Bible verses
│   └── kjv-bible.json       # Full KJV Bible text
├── js/               # JavaScript modules
│   ├── app.js       # Application initialization
│   ├── calendar.js  # Calendar rendering and interaction
│   ├── editing.js   # Day cell editing
│   ├── email-export.js  # Email export functionality
│   ├── facts-export.js     # FACTS system export
│   ├── settings.js  # Settings management
│   ├── state.js     # State management & localStorage
│   ├── tiles.js     # Tile rendering and drag-drop
│   └── verses.js    # Verse selection and Bible data
├── src-tauri/        # Tauri desktop app backend (Rust)
│   ├── src/
│   │   └── main.rs  # Tauri main entry point
│   ├── Cargo.toml   # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── ui/               # Alternative UI implementation
│   └── (mirrors js/, css/, data/ structure)
├── index.html        # Main HTML file
└── package.json      # Node.js dependencies
```

## Documentation

Additional documentation is available in the following files:

- [FACTS_EXPORT.md](FACTS_EXPORT.md) - FACTS system export specification
- [NO_SCHOOL_BEHAVIOR.md](NO_SCHOOL_BEHAVIOR.md) - NO SCHOOL day behavior documentation
- [PDF_DESIGN_INTENT.md](PDF_DESIGN_INTENT.md) - PDF design specifications
- [PRODUCT_BLUEPRINT.md](PRODUCT_BLUEPRINT.md) - Overall product design
- [README-PACKAGING.md](README-PACKAGING.md) - Packaging and deployment guide
- [SETTINGS_SPEC.md](SETTINGS_SPEC.md) - Settings specification
- [UX_CORE_RULES.md](UX_CORE_RULES.md) - UX design rules
- [VERSE_HANDLING.md](VERSE_HANDLING.md) - Verse selection and display logic

## Development

### Adding New Features

1. Modify the relevant JavaScript module in `js/`
2. Update corresponding styles in `css/`
3. Add new data files to `data/` if needed
4. Test in web version first (`python -m http.server 8080`)
5. Test in Tauri desktop app (`npm run dev`)

### State Management

Application state is managed in `js/state.js` and persisted to localStorage:

- `lunchMenu_entreeTiles` - Entree tile order
- `lunchMenu_sideTiles` - Side tile order
- `lunchMenu_specialEventTiles` - Special event tile order
- `lunchMenu_menus` - Menu data for each month
- `lunchMenu_settings` - Application settings
- `lunchMenu_currentMonth` - Currently selected month
- `lunchMenu_pdfEmail` - Default PDF email recipient
- `lunchMenu_txtEmail` - Default TXT email recipient

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- LocalStorage support required
- Print functionality required for PDF export

## License

This project is proprietary software for Christian schools.

## Support

For issues or questions, please contact the development team.
