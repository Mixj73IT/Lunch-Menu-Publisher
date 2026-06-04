# Lunch Program: User Guide

## 1. Overview

Welcome to the Lunch Program! This application helps you manage and publish your monthly lunch menus. It works in conjunction with a separate script (the "Lunch Menu Script") to automatically generate digital signage slides for your televisions.

**How it works:**
1.  You use this **Lunch Program** application to create and finalize your monthly lunch menu.
2.  Once ready, you can export the menu data, and this application will **automatically send it via email**.
3.  The **Lunch Menu Script** (running separately) monitors for these emails, extracts the menu information, and then creates daily "photo" slides suitable for digital signage systems like BrightAuthor for HD224 boxes.

## 2. Installation

To install the Lunch Program desktop application:

*   **Windows**: Download and run the latest `Lunch_Menu_Publisher_Setup_X.X.X.exe` installer from the official distribution point.
*   Follow the on-screen instructions to complete the installation.

## 3. How to Use the Lunch Program

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

### 3.3. Sending the Menu via Email

Once your menu is complete and ready for publishing:

1. Click the **"Email TXT Export"** button to send menu data for FACTS processing
2. Click the **"Email PDF"** button to send a printable PDF version
3. This will package the current month's menu data and send it as an email attachment
4. You should receive a confirmation message if the email was sent successfully

**Important**: This application sends the menu data to a pre-configured email address. Ensure this is set up correctly in the application's Settings.

### 3.4. Important Settings

Access Settings by clicking the gear icon (⚙) in the top-right corner of the header.

*   **Email Recipients**: Set the default email addresses for PDF and TXT exports
*   **Data Backup**: Use **Export All Data** to download a complete JSON backup, and **Import Data** to restore from a backup file
*   **Verse Options**: Toggle whether verses appear on the PDF, and enable advanced Bible lookup
*   **Compact Grid**: Toggle 3-column tile layout when opposite panels are collapsed

## 4. How the Lunch Menu Script Works (for your understanding)

The **Lunch Menu Script** is an automated tool that runs in the background. It periodically checks the designated email inbox for new menu exports sent from this Lunch Program application.

*   When it finds a new menu email, it automatically extracts the menu data.
*   It then processes this data to create individual graphic slides for each school day of the month.
*   These slides are then made available for your digital signage system (e.g., BrightAuthor) to display on your televisions.

This entire process is designed to be automatic once the initial setup is done, streamlining the publishing of your lunch menus to your digital displays.

## 5. Data Backup

It is recommended to regularly back up your menu data:

1.  Go to **Settings** (gear icon)
2.  Click **Export All Data** to download a `.json` backup file
3.  To restore, click **Import Data** and select your backup file
4.  The application will validate the file and reload with your restored data

## 6. Troubleshooting (Common Issues)

*   **"Email not sending" or "Email sending failed" message after clicking "Email TXT Export"**:
    *   Ensure your computer has an active internet connection.
    *   If you are an administrator, verify the email sending credentials in the application's backend configuration (e.g., `.env` file for the Tauri app).
    *   Contact technical support or your system administrator if the issue persists.

*   **Menu not appearing on digital signage / No new slides generated**:
    *   First, confirm that you successfully sent the "Email TXT Export" from the Lunch Program application.
    *   Ensure the Lunch Menu Script is running on its designated machine.
    *   Verify that the email address used by the Lunch Menu Script to receive emails is correct and that it has access to the inbox.
    *   Check with your system administrator to ensure the Lunch Menu Script's email receiving credentials and IMAP server settings are correct.
    *   There might be a delay between sending the email and the script processing it. Allow a few minutes.
    *   If issues persist, consult the `DEVELOPER_GUIDE.md` or contact technical support.
