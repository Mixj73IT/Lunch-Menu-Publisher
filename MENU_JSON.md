# menu.json — Published Schema (V5)

`menu.json` is the machine-readable snapshot of the published menu, written to
the folder configured in Settings → **menu.json Destination Folder** (normally
a Google Drive for Desktop synced folder). Google Drive syncs it to the shared
folder `0AAmBoq6Xb6TLUk9PVA`, where two consumers read it:

- **Lunch spreadsheet (admin-controller)** — `MenuSync.gs` pulls the file by
  ID (`MENU_JSON_FILE_ID` Script Property) on the 6 AM trigger and writes
  today's entry to the `Menu_Sync` tab.
- **Kiosk** — `LunchSheetService.getDailyMenu()` lists JSON files in the Drive
  menu folder (`google_oauth_menu_folder_id` / `GOOGLE_DRIVE_MENU_FOLDER_ID`),
  newest by name, and parses the first file that yields a day entry.

## Guarantees

- **Exactly one file**: `menu.json`, written to the configured folder.
- **Atomic replace**: the file is written to a temporary file first, flushed
  to disk, then renamed over the previous `menu.json`. A reader never observes
  partial JSON, and Google Drive syncs a complete file.
- **No history**: every Publish replaces the previous file. There are no dated
  archives and no `menu.json.backup` files.
- **Two months always covered**: the file always carries the **real current
  month plus the following month**, anchored to the machine's clock at publish
  time. Publishing the *next* month early (before the end of the current
  month) therefore never erases the rest of the current month — both months'
  data is rebuilt from local state on every publish.
- **Honest failure**: if the folder is missing/unwritable and `menu.json`
  cannot be written, the app reports that publishing did not complete
  successfully. It never claims success for a file that was not written.

## Contract (V5)

```json
{
  "version": 5,
  "generated": "2026-09-02T12:00:00.000Z",
  "publishedAt": "2026-09-02T12:00:00.000Z",
  "month": 9,
  "year": 2026,
  "nextMonth": 10,
  "nextYear": 2026,
  "verse": { "text": "...", "reference": "..." } | null,
  "menu": [
    {
      "date": "2026-09-01",
      "day": "Tuesday",
      "entree": "Pizza",
      "special": "Reuben",
      "sides": ["Green Beans", "Roll"],
      "event": "Bake Sale",
      "noSchool": false
    },
    "... every day of the primary month, then every day of nextMonth ..."
  ]
}
```

## Rules

- `version` is always `5`. Consumers detect the format by
  `Array.isArray(menu)`.
- `month`/`year` identify the **primary month — the real current month at
  publish time** (1-based month). `nextMonth`/`nextYear` are the month that
  follows it (December rolls over to January of the next year); the two must
  be consecutive.
- `menu` contains **every calendar day of both months**, in order: the primary
  month's days first, then the following month's days. Weekends and NO SCHOOL
  days have `noSchool: true` and empty content fields; the flag is
  authoritative. Keeping every date present prevents the kiosk's first-entry
  fallback from misfiring on days that are absent from the array.
- Consumers look entries up by `date`, so entries from the month that is not
  "today" are simply ignored until their dates arrive.
- `verse` is the primary (real current) month's verse; it is `null` when
  verses are disabled or none is chosen.
- `special` is the day's special item only (teacher / 12th-grade offerings).
  Events stay in their own `event` field; the two are never merged.
- `saladBar`, `sackLunch`, and `school` are **not emitted**. The salad bar is
  a day-of decision managed in the spreadsheets (the `Menu_Sync` tab), not by
  this app. Downstream defaults are "not available" (Option A default flip).

## Why two months?

Publishing the next month before the current one ends used to replace
`menu.json` entirely, deleting the current month's remaining days. Both
consumers read the file on a schedule, so those days silently vanished. V5
always rebuilds the file from **both** months' local data, so an early publish
of next month keeps the rest of this month intact. The PDF, TXT, and email
outputs are still produced for the month being published — only `menu.json`
covers two months.

## What each consumer reads

| Field | MenuSync.gs (Menu_Sync row) | Kiosk `getDailyMenu()` |
|---|---|---|
| `menu` | required array — aborts without it | array branch; matches `entry.date === today` |
| `date` | row Date (`yyyy-MM-dd`) | today lookup |
| `day` | row Day | ignored |
| `entree` | row Entree | `mainCourse` |
| `special` | row Special | `special` (gates "Single + Special") |
| `sides` / `event` / `noSchool` | ignored | ignored |
| `month` / `year` | ignored (dates are authoritative) | ignored (dates are authoritative) |
| `nextMonth` / `nextYear` | ignored | ignored |

## Month convention

Month is 0-based everywhere in the app (January = 0); `month` and `nextMonth`
in menu.json are 1-based (January = 1).
