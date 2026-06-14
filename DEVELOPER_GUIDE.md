# Developer Guide: Lunch Menu Publisher

## 1. Introduction

This document serves as a comprehensive technical guide for developers working on the **Lunch Menu Publisher**, a Tauri desktop application for creating, managing, and publishing monthly school lunch menus. The app is self-contained: all data persists locally, menus are generated entirely within the app, and email exports are sent directly to configured recipients without any external processing pipeline.

## 2. System Architecture

The application is a single Tauri desktop app with a web frontend (HTML, CSS, JavaScript) and a Rust backend for native capabilities.

```mermaid
graph TD
    A[Lunch Menu Publisher (Tauri Desktop App)] -->|Generates Menu, PDF, Text Export| B[User]
    A -->|Sends TXT via SMTP| C[Email Recipient]
    A -->|Prints / Saves| D[PDF Output]
```

**Components:**
*   **Frontend (HTML/CSS/JS)**: Handles UI, drag-and-drop, calendar rendering, state management, and PDF preview via CSS print media.
*   **Backend (Rust)**: Exposes a single Tauri command for SMTP email sending. All other functionality is client-side.
*   **Data Storage**: `localStorage` for all app state (tiles, menus, settings). No server or database required.

## 3. Lunch Program (Tauri App) - Technical Details

The Lunch Menu Publisher is built using Tauri, allowing for a web frontend to interact with Rust-based backend functionalities.

### 3.0. Frontend Architecture Patterns

The JavaScript codebase follows defensive patterns to prevent crashes and data loss:

**Null-Guarded DOM Access**: All `getElementById` calls are null-checked before calling `.addEventListener`. Each setup method bails early if a critical DOM element is missing (e.g., from stale cached HTML):
```js
const previewBtn = document.getElementById('previewBtn');
if (!previewBtn) return;
previewBtn.addEventListener('click', () => { ... });
```

**Persistence Rollback**: All `save*()` methods in `state.js` accept an optional `prev` parameter. If `localStorage.setItem` fails (quota full), the in-memory state is rolled back to the snapshot:
```js
saveEntreeTiles(prev) {
    if (!this.save(StorageKeys.ENTREE_TILES, this.entreeTiles) && prev !== undefined) {
        this.entreeTiles = prev;
    }
}
```
Callers snapshot before mutating: `const prev = [...State.entreeTiles]; State.entreeTiles.push(tile); State.saveEntreeTiles(prev);`

**Shared Constants**: Magic strings are eliminated via frozen constants in `state.js`:
- `TileTypes` — `{ ENTREE, SIDE, SPECIALS, SPECIAL_EVENT }` — used for tile type comparisons across `tiles.js` and `state.js`
- `GridIds` — `{ ENTREE, SIDE, SPECIALS, SPECIAL_EVENT }` — maps to DOM grid element IDs (`entreeGrid`, `sideGrid`, etc.)

**Inline Add Input**: The `addTile` flow uses an inline text input inserted into the panel (replacing `prompt()` which is unsupported in Tauri). A `committed` flag prevents double-commit from simultaneous Enter + blur events.

**Import Validation**: `importData()` validates backup structure before accepting any data — checks version number, array types, and object types. JSON parse errors are caught separately with a friendly user message.

### 3.1. Project Setup & Dependencies

*   **Rust**: The core backend logic is written in Rust.
*   **Node.js/npm**: Used for managing frontend dependencies and Tauri build processes.
*   **Tauri**: The framework for building cross-platform desktop applications using web technologies.

**Key Dependencies (`src-tauri/Cargo.toml`):**
*   `tauri = { version = "1.5.0", features = ["shell-open"] }`: Tauri framework.
*   `serde = { version = "1.0", features = ["derive"] }`: Serialization/deserialization for Rust structs.
*   `serde_json = "1.0"`: JSON handling.
*   `lettre = { version = "0.11", default-features = false, features = ["builder", "smtp-transport", "rustls-tls"] }`: Email sending library. Configured for SMTP transport with Rustls for TLS.
*   `tokio = { version = "1.36.0", features = ["full"] }`: Asynchronous runtime for Rust, used for non-blocking I/O (email sending).
*   `dotenv = "0.15"`: For loading environment variables from a `.env` file.

### 3.2. Email Sending Implementation

The email sending logic resides in the Rust backend as a Tauri command.

*   **`send_menu_email` Command**:
    *   **Location**: `src-tauri/src/main.rs`
    *   **Purpose**: This asynchronous Rust function is exposed to the JavaScript frontend via `#[tauri::command]`. It takes `recipient`, `subject`, and `menu_content` as arguments.
    *   **Environment Variables**: It reads email credentials and SMTP server details from the `.env` file located at `src-tauri/.env`. These include `EMAIL_USER`, `EMAIL_PASSWORD`, `SMTP_HOST`, and `SMTP_PORT`.
    *   **Email Construction**: Uses `lettre::Message::builder` to construct the email.
        *   `from()`: Uses `EMAIL_USER` for the sender address.
        *   `to()`: Sets the recipient.
        *   `subject()`: Sets the email subject.
        *   `multipart()`: Includes a plain text body and attaches the `menu_content` as a plain text file named `menu.txt`.
    *   **SMTP Transport**: Configures `lettre::SmtpTransport` with `SMTP_HOST`, `SMTP_PORT`, and `Credentials` for authentication. It enforces TLS for secure communication.
    *   **Error Handling**: Returns `Result<String, String>` to indicate success or failure, with error messages providing details.

### 3.3. Frontend Integration

The JavaScript part of the Tauri application calls the Rust command.

*   **`email-export.js`**:
    *   **Location**: `js/email-export.js`
    *   **`emailTxt()` Function**:
        *   Retrieves the `recipient` from `State.txtEmail` and the `exportContent` by calling `TextExport.generateExport()`.
        *   Constructs the `subject` dynamically.
        *   Calls `await tauriInvoke('send_menu_email', { recipient, subject, menuContent: exportContent });`.
        *   Provides user feedback (alerts) for success or failure.
    *   **`emailPdf()` Function**: Currently falls back to a `mailto:` link for PDF, as direct PDF attachment sending is not yet implemented in the Rust backend. A separate Rust command would be needed for this if required.

### 3.4. Build & Deployment

To build the Tauri application, navigate to the project directory in your terminal and use standard Tauri build commands:
```bash
npm install        # Install Node.js dependencies
npm run tauri build # Build the application for your platform
```
The output executable will be found in `src-tauri/target/release`.

## 4. Data & Export Formats

### 4.1. Text Export Format

The **Text Export** generates plain text suitable for copying into any school information system (SIS). Each line represents one school day:

```
Mon 9/1: Cheeseburger + Corn, Apple Slices + Bake Sale
Tue 9/2: Chicken Tenders + Mashed Potatoes, Green Beans
```

**Rules:**
*   One line per weekday
*   No weekends
*   No blank lines
*   Format: `DayOfWeek Month/Day: Entree + Side1, Side2 + SpecialEvent`
*   Sides are comma-separated; items are joined with ` + `
*   Days marked NO SCHOOL are excluded

### 4.2. PDF Export

The PDF is generated via the browser's print dialog using a dedicated CSS print stylesheet (`css/pdf.css`). The app enters **preview mode** (hiding all UI chrome) before printing. The stylesheet uses a warm burgundy/gold/cream palette with the school logo in the header.

### 4.3. Data Backup Format

The **Export All Data** button produces a JSON file containing all application state:

```json
{
  "version": 1,
  "entreeTiles": [...],
  "sideTiles": [...],
  "specialsTiles": [...],
  "specialEventTiles": [...],
  "menus": { "2026-9": { "days": {...}, "verse": {...} } },
  "settings": {...}
}
```

This file can be imported later via **Import Data** to restore the entire application state.

## 5. Email Export Details

The email export is a standalone feature for sending the monthly text menu directly to a recipient. It does not require any external processing pipeline.

*   **Sending Protocol**: SMTP (Simple Mail Transfer Protocol) over TLS for secure outgoing mail.
*   **Attachment Format**: The menu data is sent as a plain text file named `menu.txt`.
*   **Email Content**:
    *   **Sender**: The `EMAIL_USER` configured in the Tauri app's `src-tauri/.env`.
    *   **Recipient**: The address configured in the app's Settings (e.g., an office manager or SIS administrator).
    *   **Subject Line**: Follows the pattern `Menu Export - Month Year` (e.g., "Menu Export - May 2026").
    *   **Body**: A short explanatory text.
    *   **Attachment**: `menu.txt` containing the parsed menu data in a line-by-line format.
*   **Security Considerations**:
    *   **TLS**: SMTP is configured to use TLS for encrypted communication.
    *   **App Passwords**: If using email providers with Two-Factor Authentication (2FA) (e.g., Gmail), it is highly recommended to use an "App Password" instead of your main account password for programmatic access. This limits the scope of access in case credentials are compromised.
    *   **Environment Variables**: Credentials are stored in `.env` files and loaded at runtime, preventing them from being hardcoded directly into the source code. These `.env` files should be excluded from version control (`.gitignore`).

## 6. Development Workflow

### 6.1. Setting Up the Development Environment

1.  **Install Rust**: Follow instructions on [rustup.rs](https://rustup.rs/).
2.  **Install Node.js**: Use a version manager like `nvm` or download from [nodejs.org](https://nodejs.org/).
3.  **Install Tauri Prerequisites**: Refer to the [Tauri documentation](https://tauri.app/v1/guides/getting-started/prerequisites) for your operating system.
4.  **Clone Repository**: `git clone <repository-url>`
5.  **Install Frontend Dependencies**: `npm install` in the project root.
6.  **Create `.env`**: Create `src-tauri/.env` in the project root and configure `EMAIL_USER`, `EMAIL_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`.
7.  **Run Development**: `npm run tauri dev`

### 6.2. Testing Procedures

*   **Unit Tests**: Implement unit tests for the email sending Rust command.
*   **Integration Tests**:
    1.  Start the Tauri app in development mode.
    2.  Generate a menu and send the TXT export.
    3.  Verify the email arrives at the configured recipient with the `menu.txt` attachment.
*   **Manual Testing**: Ensure the full flow from menu creation to print preview and email export works as expected.

### 6.3. Troubleshooting Common Issues

*   **Email Sending Failures**:
    *   Check `src-tauri/.env` for correct credentials and SMTP server details.
    *   Verify network connectivity to the SMTP server.
    *   Check if your email provider requires "App Passwords" for programmatic access.
    *   Review Tauri app console logs for Rust backend errors related to email sending.
*   **Incorrect Menu Data**:
    *   Inspect the `menu.txt` attachment to ensure its format is correct.
    *   Check that weekends and NO SCHOOL days are properly excluded.

## 7. Future Enhancements / Considerations

*   **Richer Data Format**: Consider sending menu data in JSON format within the email attachment for easier machine parsing.
*   **Error Reporting**: Implement more sophisticated error logging and reporting, potentially integrating with a centralized logging service.
*   **Configuration UI**: Provide a UI in Settings to configure email sending parameters rather than relying solely on the `.env` file.
*   **PDF Handling**: Implement Rust-side logic to attach the generated PDF directly to the email from the Tauri app, instead of relying on `mailto:` for PDF exports.
*   **Security Audit**: Conduct a security audit of the email credential handling and network communication to ensure best practices are followed, especially if deployed in a production environment.
