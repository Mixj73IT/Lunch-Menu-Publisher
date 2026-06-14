# Developer Guide: Lunch Menu Automation System

## 1. Introduction

This document serves as a comprehensive technical guide for developers working on the integrated Lunch Menu Automation System. It details the architecture, implementation specifics, and interaction mechanisms between the "Lunch Program" (a Tauri desktop application) and the "Lunch Menu Script" (a Python script). The primary goal of this integration is to automate the transfer of lunch menu data from the Lunch Program to the Python script via email, enabling the Python script to generate daily signage slides.

## 2. System Architecture

The system comprises two main applications communicating through a standard email service, facilitating a decoupled and asynchronous data flow.

```mermaid
graph TD
    A[Lunch Program (Tauri Desktop App)] --&gt;|Generates Menu, Sends Email| B(Email Service - SMTP)
    B --&gt;|Stores Email| C(Email Service - IMAP)
    C --&gt;|Fetches Email, Extracts Attachment| D[Lunch Menu Script (Python)]
    D --&gt;|Processes Data, Generates Signage| E[Digital Signage (e.g., BrightAuthor)]
```

**Components:**
*   **Lunch Program (Tauri App)**: A cross-platform desktop application responsible for generating monthly lunch menus and exporting them. It now includes functionality to send the generated menu as a plain text attachment via email.
*   **Email Service (SMTP/IMAP)**: A standard email provider used for sending (SMTP) and receiving (IMAP) the menu data. This acts as the communication backbone.
*   **Lunch Menu Script (Python)**: A Python script designed to fetch the latest menu email, extract the menu data from an attachment, parse it, and then generate visual output (signage slides).
*   **Digital Signage**: The final destination for the generated menu slides, such as BrightAuthor for HD224 boxes.

## 3. Lunch Program (Tauri App) - Technical Details

The Lunch Program is built using Tauri, allowing for a web frontend (HTML, CSS, JavaScript) to interact with Rust-based backend functionalities.

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
*   `lettre_email = "0.1"`: Helper library for building email messages with `lettre`.
*   `tokio = { version = "1.36.0", features = ["full"] }`: Asynchronous runtime for Rust, used for non-blocking I/O (email sending).
*   `dotenv = "0.15"`: For loading environment variables from a `.env` file.

### 3.2. Email Sending Implementation

The email sending logic resides in the Rust backend as a Tauri command.

*   **`send_menu_email` Command**:
    *   **Location**: [main.rs](file:///c:/Users/Jr/Projects/Lunch%20Program_new/src-tauri/src/main.rs#L6-L65)
    *   **Purpose**: This asynchronous Rust function is exposed to the JavaScript frontend via `#[tauri::command]`. It takes `recipient`, `subject`, and `menu_content` as arguments.
    *   **Environment Variables**: It reads email credentials and SMTP server details from the `.env` file located at `src-tauri/.env`. These include `EMAIL_USER`, `EMAIL_PASSWORD`, `SMTP_HOST`, and `SMTP_PORT`.
    *   **Email Construction**: Uses `lettre_email::EmailBuilder` to construct the email.
        *   `from()`: Uses `EMAIL_USER` for the sender address.
        *   `to()`: Sets the recipient.
        *   `subject()`: Sets the email subject.
        *   `text()`: Includes a simple body message.
        *   `attachment_text()`: Attaches the `menu_content` as a plain text file named `menu.txt`. This is crucial for the Python script to pick it up.
    *   **SMTP Transport**: Configures `lettre::SmtpTransport` with `SMTP_HOST`, `SMTP_PORT`, and `Credentials` for authentication. It enforces TLS for secure communication.
    *   **Error Handling**: Returns `Result<String, String>` to indicate success or failure, with error messages providing details.

### 3.3. Frontend Integration

The JavaScript part of the Tauri application calls the Rust command.

*   **`email-export.js`**:
    *   **Location**: [js/email-export.js](file:///c:/Users/Jr/Projects/Lunch%20Program_new/js/email-export.js#L1-L89)
    *   **Import**: It imports `invoke` from `@tauri-apps/api/tauri` to communicate with the Rust backend.
    *   **`emailTxt()` Function**:
        *   Retrieves the `recipient` from `State.txtEmail` and the `exportContent` by calling `FactsExport.generateExport()`.
        *   Constructs the `subject` dynamically.
        *   Calls `await invoke('send_menu_email', { recipient, subject, menuContent: exportContent });`.
        *   Provides user feedback (alerts) for success or failure.
    *   **`emailPdf()` Function**: Currently falls back to a `mailto:` link for PDF, as direct PDF attachment sending is not yet implemented in the Rust backend. A separate Rust command would be needed for this if required.

### 3.4. Build & Deployment

To build the Tauri application, navigate to the project directory in your terminal and use standard Tauri build commands:
```bash
npm install        # Install Node.js dependencies
npm run tauri build # Build the application for your platform
```
The output executable will be found in `src-tauri/target/release`.

## 4. Lunch Menu Script (Python) - Technical Details

The Python script is responsible for fetching the menu data via email and processing it.

### 4.1. Project Setup & Dependencies

*   **Python**: The script is written in Python 3.
*   **`python-dotenv`**: For loading environment variables from a `.env` file.
    ```bash
    pip install python-dotenv
    ```
*   **`imaplib`**: Standard Python library for IMAP client operations.
*   **`email`**: Standard Python library for parsing email messages.

### 4.2. Email Receiving Implementation

The email receiving logic is encapsulated in `email_receiver.py`.

*   **`email_receiver.py`**:
    *   **Location**: [email_receiver.py](file:///c:/Users/Jr/Desktop/Lunch%20Menu%20Script_new/email_receiver.py)
    *   **`get_menu_from_email(sender_email, subject_prefix, attachment_filename)` Function**:
        *   **Environment Variables**: Loads `IMAP_SERVER`, `IMAP_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` from the `.env` file in the Python script's directory.
        *   **IMAP Connection**: Establishes a secure connection (`IMAP4_SSL`) to the IMAP server using the provided credentials.
        *   **Email Search**: Searches the "inbox" for emails matching the `sender_email` and `subject_prefix`.
        *   **Attachment Extraction**: Fetches the latest matching email, parses its parts, and extracts the content of the attachment named `menu.txt`.
        *   **Error Handling**: Returns a dictionary indicating success or an error message.
    *   **`parse_menu_content(content)` Function**:
        *   **Purpose**: Parses the plain text content extracted from `menu.txt` into a structured list of dictionaries.
        *   **Expected Format**: Each line is expected to be in the format: `"DayOfWeek Month/Day: Entree + Side1, Side2 + SpecialEvent"`.
        *   **Parsing Logic**: Splits the line by `: ` to separate date and food items. Further splits food items by ` + ` to identify entree, sides (comma-separated), and special events.
        *   **Output**: Returns a `list[dict]` where each dictionary represents a day's menu entry with keys like `date_str`, `day_of_week`, `entree`, `sides`, `special_event`.

### 4.3. Main Script Logic

The `Menu_Gen_Pro.py` orchestrates the fetching and processing.

*   **`Menu_Gen_Pro.py`**:
    *   **Location**: [Menu_Gen_Pro.py](file:///c:/Users/Jr/Desktop/Lunch%20Menu%20Script_new/Menu_Gen_Pro.py#L12-L46)
    *   **Email Configuration**: Defines `EMAIL_SENDER` and `EMAIL_SUBJECT_PREFIX` (can be configured via `.env` in the future).
    *   **`main()` Function**:
        *   Calls `setup_dirs()` from `menu_core` to ensure output directories exist.
        *   Invokes `email_receiver.get_menu_from_email()` to fetch the structured menu data.
        *   Handles potential errors during email fetching.
        *   Iterates through the `raw_menu_data` (list of dictionaries) and converts each entry into a `MenuEntry` object (from `menu_core`). This includes converting the `Month/Day` format to a full `YYYY-MM-DD` date string.
        *   Calls `process_entries()` from `menu_core` to generate the signage slides based on the `MenuEntry` objects.
        *   Calls `print_summary()` for optional output.

## 5. Email Integration Details

This section details the critical communication link between the two applications.

*   **Communication Protocol**:
    *   **Sending**: SMTP (Simple Mail Transfer Protocol) over TLS for secure outgoing mail.
    *   **Receiving**: IMAP (Internet Message Access Protocol) over SSL (IMAPS) for secure incoming mail.
*   **Attachment Format**: The menu data is sent as a plain text file named `menu.txt`. This simplicity ensures broad compatibility and easy parsing.
*   **Email Content**:
    *   **Sender**: The `EMAIL_USER` configured in the Tauri app's `src-tauri/.env`.
    *   **Recipient**: The `EMAIL_USER` configured in the Python script's `email_receiver/.env`.
    *   **Subject Line**: Follows the pattern "FACTS Export - Month Year" (e.g., "FACTS Export - May 2026"). The Python script searches for emails matching `subject_prefix="FACTS Export"`.
    *   **Body**: A short explanatory text.
    *   **Attachment**: `menu.txt` containing the parsed menu data in a line-by-line format: `"DayOfWeek Month/Day: Entree + Side1, Side2 + SpecialEvent"`.
*   **Security Considerations**:
    *   **TLS/SSL**: Both sending (SMTP) and receiving (IMAP) are configured to use TLS/SSL for encrypted communication.
    *   **App Passwords**: If using email providers with Two-Factor Authentication (2FA) (e.g., Gmail), it is highly recommended to use an "App Password" instead of your main account password for programmatic access. This limits the scope of access in case credentials are compromised.
    *   **Environment Variables**: Credentials are stored in `.env` files and loaded at runtime, preventing them from being hardcoded directly into the source code. These `.env` files should be excluded from version control (`.gitignore`).

## 6. Development Workflow

### 6.1. Setting Up Development Environments

**Lunch Program (Tauri App):**
1.  **Install Rust**: Follow instructions on [rustup.rs](https://rustup.rs/).
2.  **Install Node.js**: Use a version manager like `nvm` or download from [nodejs.org](https://nodejs.org/).
3.  **Install Tauri Prerequisites**: Refer to the [Tauri documentation](https://tauri.app/v1/guides/getting-started/prerequisites) for your operating system.
4.  **Clone Repository**: `git clone <repository-url>`
5.  **Install Frontend Dependencies**: `npm install` in the project root.
6.  **Create `.env`**: Create `src-tauri/.env` in the project root and configure `EMAIL_USER`, `EMAIL_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`.
7.  **Run Development**: `npm run tauri dev`

**Lunch Menu Script (Python):**
1.  **Install Python 3**: Download from [python.org](https://www.python.org/downloads/).
2.  **Clone Repository**: `git clone <repository-url>` (or ensure the files are in your working directory).
3.  **Install Dependencies**: `pip install -r requirements.txt` (if a `requirements.txt` exists, otherwise `pip install python-dotenv`).
4.  **Create `.env`**: Create `.env` in the script's directory and configure `IMAP_SERVER`, `IMAP_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`.
5.  **Run Script**: `python Menu_Gen_Pro.py`

### 6.2. Testing Procedures

*   **Unit Tests**: Implement unit tests for the email parsing logic in `email_receiver.py` and the email sending Rust command.
*   **Integration Tests**:
    1.  Start the Tauri app in development mode.
    2.  Generate a menu and send the TXT export.
    3.  Manually (or via an automated test runner) execute `Menu_Gen_Pro.py` and verify that it correctly fetches and processes the email, and generates the expected output.
*   **Manual Testing**: Ensure the entire flow from menu creation in the Tauri app to final signage generation by the Python script works as expected.

### 6.3. Troubleshooting Common Issues

*   **Email Sending Failures (Tauri)**:
    *   Check `src-tauri/.env` for correct credentials and SMTP server details.
    *   Verify network connectivity to the SMTP server.
    *   Check if your email provider requires "App Passwords" for programmatic access.
    *   Review Tauri app console logs for Rust backend errors related to email sending.
*   **Email Receiving Failures (Python)**:
    *   Check the `.env` file in the script's directory for correct IMAP server, port, credentials.
    *   Ensure the `sender_email` and `subject_prefix` in `get_menu_from_email` match the email sent by the Tauri app.
    *   Verify network connectivity to the IMAP server.
    *   Check if the email actually arrived in the inbox and contains the `menu.txt` attachment.
    *   Review Python script console output for IMAP connection or parsing errors.
*   **Incorrect Menu Data**:
    *   Inspect the `menu.txt` attachment sent by the Tauri app to ensure its format is correct.
    *   Debug `email_receiver.parse_menu_content` to ensure it's correctly interpreting the `menu.txt` content.

## 7. Future Enhancements / Considerations

*   **Richer Data Format**: Instead of plain text, consider sending menu data in a structured format like JSON within the email attachment. This would make parsing more robust and less prone to errors from format variations.
*   **Dedicated API Endpoint**: For more robust and real-time integration, a dedicated API endpoint (e.g., a small web service) could be exposed by the Python script (or a separate service) for the Tauri app to send data directly, bypassing email. This would offer better error handling, immediate feedback, and potentially more secure authentication.
*   **Error Reporting**: Implement more sophisticated error logging and reporting for both applications, potentially integrating with a centralized logging service.
*   **Configuration UI**: For the Tauri app, provide a UI in settings to configure email sending parameters rather than relying solely on the `.env` file.
*   **PDF Handling**: Implement Rust-side logic to attach the generated PDF directly to the email from the Tauri app, instead of relying on `mailto:` for PDF exports.
*   **Security Audit**: Conduct a security audit of the email credential handling and network communication to ensure best practices are followed, especially if deployed in a production environment.
*   **Scalability**: For very high volumes of menu updates or multiple receiving scripts, consider message queues (e.g., RabbitMQ, Kafka) as an intermediary instead of direct email for more reliable and scalable communication.
