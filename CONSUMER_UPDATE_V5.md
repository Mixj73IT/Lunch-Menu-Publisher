# menu.json V4 → V5 — Update Brief for External Consumers

> Hand this document to the LLM tool that edits the two external consumers:
> **MenuSync.gs** (Google Apps Script, lunch spreadsheet sync) and the
> **Kiosk's** `LunchSheetService.getDailyMenu()`.
>
> Repository note: these scripts live outside this repo. They read the shared
> file `menu.json` produced by the desktop app from the Google Drive folder
> `0AAmBoq6Xb6TLUk9PVA`.

---

## 1. TL;DR

- **If you already look entries up by `date` (you both do), the only required
  change is to accept `version: 5` instead of `version: 4`.**
- The `menu` array now contains **two consecutive months**, not one. Totally
  ignore the month you're not on — the extra entries are harmless because they
  never match today's date.
- Everything else (every per-entry field, the lookup logic) is unchanged.

---

## 2. What changed vs. V4

| | V4 (old) | V5 (new) |
|---|---|---|
| `version` | `4` | `5` |
| `month` / `year` | the one published month | the **primary month = the real current month** at publish time |
| new `nextMonth` / `nextYear` | absent | the month immediately following the primary (Dec→Jan rollover handled) |
| `menu` array | every day of **one** month | every day of **both** months, primary first — total length = `daysInMonth(primary) + daysInMonth(next)` |
| each entry shape | `{ date, day, entree, special, sides, event, noSchool }` | **identical** |
| lookup | by `entry.date` | same |

**Why:** the app publishes the next month's menu early (before the current
month ends). That used to overwrite `menu.json` with only the next month,
deleting the rest of the current month from the file. V5 always includes the
real current month + the following month, so publishing next month early never
erases the rest of the current one.

---

## 3. New contract (V5)

```json
{
  "version": 5,
  "generated": "2026-09-02T12:00:00.000Z",
  "publishedAt": "2026-09-02T12:00:00.000Z",
  "month": 9,        // 1-based, real current month
  "year": 2026,
  "nextMonth": 10,   // 1-based, month after the primary
  "nextYear": 2026,
  "verse": { "text": "...", "reference": "..." } | null,
  "menu": [
    { "date": "2026-09-01", "day": "Tuesday", "entree": "Pizza",
      "special": "Reuben", "sides": ["Green Beans", "Roll"],
      "event": "Bake Sale", "noSchool": false },
    "... every day of September 2026, then every day of October 2026 ..."
  ]
}
```

Per-entry contract (unchanged):
- `date` — ISO `yyyy-MM-dd`; this is the join key for "today".
- `day` — full day name; informational.
- `entree` — the day's main course (empty when NO SCHOOL / weekend).
- `special` — special item only (teacher/12th-grade offerings).
- `event` — the day's special event (never merged into `special`).
- `sides` — array of strings.
- `noSchool` — boolean, authoritative. When `true` the other fields are empty.
- No `saladBar` / `sackLunch` / `school` fields are emitted (day-of decisions
  live in the spreadsheets).

---

## 4. Required changes per consumer

### 4.1 `MenuSync.gs` (lunch spreadsheet)

Audit this file for each of the following and update only what's present:

1. **`version` gate** — If it asserts `version === 4`, change to accept `5`
   (keep `4` accepted too, for robustness against any stale file). Example:
   `if (menuJson.version < 5 && menuJson.version !== 4) throw ...`
2. **"Write today's entry" logic** — Confirm it resolves today by matching
   `entry.date === today`, NOT by array position or by "exactly 30/31 entries".
   If it selects by date, **no change needed**.
3. **Day-count validation** — If the script sanity-checks that
   `menu.length === daysInMonth(...)`, this now fails (it's two months).
   Replace with a check on the **coverage of both declared months**, or simply
   drop the count check and rely on the date filter. Correct ground truth:
   `expectedLength = daysInMonth(year, month) + daysInMonth(nextYear, nextMonth)`.
4. **Bulk-write behavior** — If (and only if) the script writes *every* entry
   in `menu` to a tab instead of just today's, it will now add rows for the
   second month. Prefer filtering to a single target date/week so no
   cross-month rows are written. This is a behavior improvement, not a bug.
5. **Top-level `month`/`year` reads** — These are now the real current month.
   If the script uses them to derive "which month am I syncing", that is
   correct and needs no change; prefer `entry.date` for any per-day work.

### 4.2 Kiosk `LunchSheetService.getDailyMenu()`

Audit:

1. **Version gate** — accept `5` (`Array.isArray(json.menu)` is the documented
   detector; if you additionally check `version`, allow 4 and 5).
2. **Today lookup** — It already does `menu.find(e => e.date === today)`; the
   extra month's entries never match today, so **no change needed**.
3. **File enumeration** — It lists JSON files, newest by name, and parses the
   first file that yields a day entry. With a single two-month `menu.json` this
   still resolves today correctly.

---

## 5. Example expected file (September 1, 2026, primary month September)

Representative reduced fragment; real files contain every day of both months.

```json
{
  "version": 5,
  "generated": "2026-09-01T06:00:00.000Z",
  "publishedAt": "2026-09-01T06:00:00.000Z",
  "month": 9,
  "year": 2026,
  "nextMonth": 10,
  "nextYear": 2026,
  "verse": { "text": "In all thy ways acknowledge him...", "reference": "Proverbs 3:6" },
  "menu": [
    { "date": "2026-09-01", "day": "Tuesday", "entree": "Pizza",
      "special": "Reuben", "sides": ["Green Beans", "Roll"], "event": "", "noSchool": false },
    { "date": "2026-09-05", "day": "Saturday", "entree": "","special": "",
      "sides": [], "event": "", "noSchool": true }
  ]
}
```

> Dates are authoritative and are the only key you should rely on. Never index
> `menu[0]` / `menu[n]` by array position across a version boundary.