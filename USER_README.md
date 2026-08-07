# Lunch Menu Publisher — A First-Time Guide

**What this app does, in one sentence:** You build one month's school lunch menu by clicking and dragging, and then one button creates everything you need to share it — a printed PDF, a text file for your student information system, a copy that other school projects can read, and an email to the office.

Everything you type is saved automatically, and all of it stays on this computer — no account, no internet needed.

---

## Step 1 — Open the app and set it up once (the gear button)

Click the **gear icon** in the top-right corner to open **Settings**. Do this once; you won't need to again.

**a) Tell it where to put the computer file.** Find **"menu.json Destination Folder"** and click **Choose Folder…**, then pick the folder where you want it saved. *This app's menu.json is meant to end up at the school's Google Drive file — `menu.json` (https://drive.google.com/file/d/11UMxAtR5zMCywqZb2nQmYWwSzoVRxUjlaBaVh1HV_mY/view). The app writes the file to a local folder and Google Drive for Desktop syncs it up automatically, so choose the local folder that syncs to that Drive file.*

**b) Set up the office email (optional).** If you want the app to email your menu to the office when you publish:

- **Staff-Office Email Recipient:** the office's email address (e.g. `office@example.com`)
- **SMTP Host / Port / Email User / Email Password:** these are the email server details your IT person can give you (port `587` or `465` are the usual ones)
- Click **Test Connection** to make sure it's right, then **Send Test Email** to confirm it actually arrives

**c) Check the three switches.** By default the app shows a Bible verse on the menu and allows the full verse lookup — leave them on unless you don't want that. The third switch is a layout nicety you can ignore.

---

## Step 2 — Build the menu for your month

**a) Go to the right month.** At the top, click the **‹** and **›** arrows to move between months. (Your computer's keyboard: hold `Ctrl` and press the left/right arrows.)

**b) Know the four ingredient trays.** On the sides of the calendar you'll see four lists:

- **Entrées** — the main dish (Pizza, Hot Dog…)
- **Sides** — everything that comes with it (Green Beans, Roll…)
- **Specials** — extra-purchase food (Reuben, Bake Sale items…)
- **Special Events** — notes like "Field Trip" or "Thanksgiving Feast"

Each tray has a **+** button to add your own items, and you can remove an item with the small **×** on it.

**c) Put food on days — two ways:**

- **Drag:** grab a tile (like "Pizza") and drag it onto a day on the calendar. Drag a side onto the same day to add it, then another side, and so on.
- **Type:** click any day and just type. Use the format shown: `Entrée | Side1, Side2 | Special | Event` (the `|` separates the sections).

**d) Handle days off.** For a weekday with no school, click the small **NS** button on that day — it becomes a "NO SCHOOL" day. Weekends are already marked automatically. NO SCHOOL days are skipped everywhere that matters (the text file, the email) and get no menu.

**e) Don't worry about milk.** Milk is a fixed staple — it shows automatically on every school day, and it's never listed in the text file because everyone already knows.

**f) Add a verse (optional).** Click **Select Verse** above the calendar:

- **Curated** — a short list of ready-to-use verses; pick one
- **Advanced** — pick Book → Chapter → Verse and click **Select**
- **No Verse** — remove the verse

The verse shows on the calendar and on the PDF (you can turn this off in Settings).

**Made a mistake?** Press `Ctrl+Z` to undo, or click the **×** on a day to clear everything on it.

---

## Step 3 — Look it over

- Click **Preview** (top right) to see exactly what the printed menu will look like, then **Print** to make a paper copy or "Save as PDF" from the print window. Press `Esc` or click **Exit Preview** to go back.
- A **✓ Published** badge appears next to the month when a month has been published.
- If some school days have no entrée yet, the app will gently remind you before publishing — you can still publish if you want.

---

## Step 4 — Publish the month (the big button)

When the month looks right, click **Publish Month** (top right).

1. A confirmation window appears, listing anything you should double-check (like days missing an entrée, or an unconfigured email).
2. Click **Publish Month** again.
3. Watch the checklist run. The app creates **four things**, and shows a ✓ or ✗ next to each:

| Output | Where it goes | What it's for |
|---|---|---|
| **PDF file** | Your Downloads folder | Printing, posting, sharing |
| **TXT file** | Your Downloads folder | The text your student information system (FACTS/RenWeb) understands |
| **menu.json** | The folder you chose in Settings — syncs up to the school's Google Drive file | Read automatically by other school projects (canonical file: https://drive.google.com/file/d/11UMxAtR5zMCywqZb2nQmYWwSzoVRxUjlaBaVh1HV_mY/view) |
| **Staff-office email** | Sent to the address you set in Settings | A quick copy for the office, with the menu attached |

4. When it's done you'll see a green **"Publishing complete"** message. That green message only appears if the computer file was truly saved — the app never claims success it didn't earn.

**If something fails:** the checklist shows exactly which step didn't work and why. A common one is the PDF — if the automatic PDF fails, the app tells you and the **Preview → Print → "Save as PDF"** route always works as a backup. Nothing gets lost: each step is independent.

---

## A few good-to-know things

- **Autosave:** everything is saved as you go. You can close the app and come back tomorrow.
- **Backup:** in Settings, **Export All Data** saves one file with all your menus and tiles — keep it somewhere safe. **Import Data** brings a backup back (handy when moving to a new computer). Email passwords are never included in backups, so you'd re-enter those.
- **This is your data, on your computer.** No accounts, no cloud, nothing leaves your machine except the email you choose to send and the files you place in a synced folder.

---

That's the whole job: **set it up once → drag and type a month → Publish Month.** Most of your time goes into Step 2, which is exactly where it should go.
