# Verse Handling

## Scope
- Verses decorate the PDF only
- Verses do NOT affect FACTS output
- Verses are optional but first‑class

## Data Source
- KJV Bible stored locally (public domain)
- No external Bible APIs

## Default UX
- Curated verse list shown by default
- Simple selection (or “None”)

## Advanced (Optional)
- Book → Chapter → Verse lookup
- No free‑text search
- Selected verse cached locally

## Formatting
- Verse stored as text + reference separately
- Formatting controlled by PDF style, not user input

# Curated Verses (Month- and Holiday-Aware)

## Purpose
Curated verses exist to set a thoughtful, faith-affirming tone for the monthly lunch menu PDF.
They are decorative and contextual, not instructional.

Verses are part of the presentation of the document and should feel intentional, seasonal, and appropriate
for a Christian school audience of mixed ages.

---

## Structure

Curated verses are organized by **month**, with optional **holiday associations** where appropriate.

The system may:
- Default to verses associated with the selected month
- Allow the user to choose an alternate verse from the curated list
- Allow “None” (no verse) as a valid option

Verses are **never required** to export.

---

## Data Model

Each curated verse must include:

- `text` (string, KJV)
- `reference` (string, e.g. "Psalm 145:15")
- `months` (array of month numbers, 1–12)
- OPTIONAL: `holiday` (string label only, e.g. "Christmas", "Easter")

Formatting is controlled by the PDF renderer, not the data.

---

## Monthly Association Rules (Important)

- Each verse may be associated with one or more months.
- A month should have **3–5 curated verses** available.
- Verses should reflect general seasonal themes, not precise dates.
- Verses should not assume a specific denominational calendar.

Example themes:
- Gratitude
- Provision
- Renewal
- Community
- Faithfulness
- Joy
- Rest

Avoid:
- Dense doctrinal passages
- Long multi-verse excerpts
- Harsh or confrontational language

---

## Holiday Handling

Holiday association is **contextual, not automatic**.

Rules:
- Holidays are used only as a filtering aid, never forced.
