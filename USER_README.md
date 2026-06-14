# Lunch Menu Publisher: User Guide

## 1. Overview

Welcome to the **Lunch Menu Publisher**! This application helps you create, manage, and publish monthly lunch menus for your school. All data is stored locally on your computer, and the app works entirely offline.

**How it works:**
1.  You use the **Lunch Menu Publisher** application to create and finalize your monthly lunch menu.
2.  Once ready, you can print a professional PDF, copy a plain text export, or email the menu directly to recipients.
3.  All menus, tiles, and settings are saved automatically to your computer.

## 2. Installation

To install the Lunch Menu Publisher desktop application:

*   **Windows**: Download and run the latest `Lunch_Menu_Publisher_Setup_X.X.X.exe` installer from the official distribution point.
*   Follow the on-screen instructions to complete the installation.

## 3. How to Use the Lunch Menu Publisher

### 3.1. Generating a Menu

Use the application interface to input and organize your monthly lunch menu items.

**Adding items to panels:**
1. Click the **blue + button** on any panel (Entrées, Specials, Sides, Special Events)
2. Type the item name in the text field that appears at the top of the panel
3. Press **Enter** to add, or **Escape** to cancel

**Adding items to the calendar:**
1. Click and drag any tile from the panels onto a calendar day cell
2. The item appears on that day immediately
3. You can also add or edit items by clicking directly on a day cell

**NO SCHOOL days:**
- Click the **NS** button on any weekday to toggle NO SCHOOL status
- NO SCHOOL days show diagonal pattern and text in the calendar

**Special Events:**
- Drag Special Event tiles (like "Bake Sale" or "Grandparents Day") onto calendar cells
- These appear with a gold left border in the calendar and PDF

**Undo:**
- Press **Ctrl+Z** to undo the last calendar edit or tile library change
- An Undo button also appears after removing tiles

Ensure all dates and menu entries are accurate before exporting.

### 3.2. Previewing and Printing

Once your menu is complete:

1. Click the **Preview** button to see how the menu will look when printed
2. The preview shows a warm-toned layout with the school logo, Bible verse, and full calendar grid
3. Click **Print** in preview mode to send to your printer
4. Click **Exit Preview** to return to editing

### 3.3. Exporting the Menu

Once your menu is complete and ready for publishing:

1. Click the **"Text Export"** button to open a plain text copy of the menu. You can copy this and paste it into any school information system.
2. Click the **"Email TXT"** button to send the plain text export directly to a recipient via email.
3. Click the **"Email PDF"** button to send a printable PDF version via email.
4. You should receive a confirmation message if the email was sent successfully.

**Important**: Email delivery requires the desktop app to be configured with SMTP credentials. If you are an administrator, see the `DEVELOPER_GUIDE.md` for setup instructions.

### 3.4. Important Settings

Access Settings by clicking the gear icon (⚙) in the top-right corner of the header.

*   **Email Recipients**: Set the default email addresses for PDF and TXT exports
*   **Data Backup**: Use **Export All Data** to download a complete JSON backup, and **Import Data** to restore from a backup file
*   **Verse Options**: Toggle whether verses appear on the PDF, and enable advanced Bible lookup
*   **Compact Grid**: Toggle 3-column tile layout when opposite panels are collapsed

## 4. Data Backup

It is recommended to regularly back up your menu data:

1.  Go to **Settings** (gear icon)
2.  Click **Export All Data** to download a `.json` backup file
3.  To restore, click **Import Data** and select your backup file
4.  The application will validate the file and reload with your restored data

## 5. Troubleshooting (Common Issues)

*   **"Email not sending" or "Email sending failed" message after clicking "Email TXT Export"**:
    *   Ensure your computer has an active internet connection.
    *   If you are an administrator, verify the email sending credentials in the application's backend configuration (e.g., `.env` file for the Tauri app).
    *   Contact technical support or your system administrator if the issue persists.

*   **Menu data is missing after reopening the app**:
    *   Check that your browser or system has not cleared localStorage.
    *   If you previously exported a backup, use **Import Data** to restore it.

