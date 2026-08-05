# menu.json — Integration Output Specification

`menu.json` is the machine-readable snapshot of a published month. It is **not a
backup** — other local projects read it (for example, a digital signage app or
a weekly newsletter builder). It is written to the folder configured in
Settings → **menu.json Destination Folder** (normally a Google Drive for Desktop
synced folder so other machines/projects can read it).

## Guarantees

- **Exactly one file**: `menu.json`, written to the configured folder.
- **Atomic replace**: the file is written to a temporary file first, flushed to
  disk, then renamed over the previous `menu.json`. A reader never observes
  partial JSON, and Google Drive syncs a complete file.
- **No history**: every Publish replaces the previous file. There are no dated
  archives and no `menu.json.backup` files.
- **Honest failure**: if the folder is missing/unwritable and `menu.json`
  cannot be written, the app reports that publishing did not complete
  successfully. It never claims success for a file that was not written.

## Schema (version 1)

```json
{
  "schemaVersion": 1,
  "publishedAt": "2026-09-02T14:30:00.000Z",
  "month": 9,
  "year": 2026,
  "verse": {
    "text": "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
    "reference": "Proverbs 3:5"
  },
  "days": [
    {
      "date": "2026-09-01",
      "entree": "Pizza",
      "sides": ["Green Beans", "Roll"],
      "specials": "Reuben",
      "event": "Bake Sale",
      "noSchool": false
    },
    {
      "date": "2026-09-05",
      "entree": "",
      "sides": [],
      "specials": "",
      "event": "",
      "noSchool": true
    }
  ]
}
```

### Field reference

| Field          | Type              | Meaning                                                                 |
|----------------|-------------------|-------------------------------------------------------------------------|
| `schemaVersion`| integer           | Schema version. Currently `1`. Bump only for breaking changes.          |
| `publishedAt`  | string (ISO-8601) | When the month was published (UTC, `YYYY-MM-DDTHH:mm:ss.sssZ`).         |
| `month`        | integer           | **1-based** month (January = `1`).                                      |
| `year`         | integer           | Full year, e.g. `2026`.                                                 |
| `verse`        | object \| null    | `{ "text", "reference" }` when a verse is enabled and selected, else `null`. |
| `days`         | array             | **Every calendar day of the month**, in order.                          |

### `days[]` entry

| Field      | Type     | Meaning                                                       |
|------------|----------|---------------------------------------------------------------|
| `date`     | string   | ISO-8601 date, `YYYY-MM-DD`.                                  |
| `entree`   | string   | Main dish, or `""`.                                           |
| `sides`    | array    | List of sides, or `[]`.                                       |
| `specials` | string   | Special offering (teachers & 12th-grade students only), or `""`. |
| `event`    | string   | Event / announcement (e.g. "Bake Sale"), or `""`.             |
| `noSchool` | boolean  | `true` for weekends and NO SCHOOL days.                       |

### Consistency rules (stable for consumers)

- `days` always contains every calendar day of the month — count it with
  `days.length`, don't infer from school-day logic.
- Weekend days and NO SCHOOL days have `noSchool: true` and **empty**
  `entree`/`sides`/`specials`/`event` values.
- Empty values use `""` for strings and `[]` for arrays — keys are never
  omitted and never `null` inside a day entry.
- Milk is not listed: it is a fixed school staple served every school day and
  is always implied.
- Dates never include time components.
