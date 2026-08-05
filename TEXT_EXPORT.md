# Text Export (`Lunch Menu - September 2026.txt`)

## Purpose

A plain-text file for manual import/paste into FACTS / RenWeb. Produced by
**Publish Month** and saved to the user's Downloads folder.

## Exact format

One line per instructional day that has content:

```
Mon 9/1: Pizza + Green Beans, Roll + [Reuben] + Bake Sale
Tue 9/2: Tacos
```

- **Day + date**: `Mon 9/1` — three-letter weekday abbreviation, then
  `Month/Day` with no leading zeros.
- **Separator**: `: ` after the date.
- **Entrée first**, then sides.
- **Sides** are comma-separated: `Green Beans, Roll`.
- **Items are joined with ` + `** (including between entrée and sides).
- **Specials** (teachers & 12th-grade offerings) are wrapped in square
  brackets: `[Reuben]`.
- **Events / announcements** are appended as plain text after a ` + `.

## Rules

- Weekdays only — weekends excluded.
- NO SCHOOL days excluded (even if they contain stale content).
- Empty days excluded (no entrée, sides, specials, or event).
- Milk is NOT included: it is a fixed school staple and is handled separately
  by the school's system.

## Example (September 2026, with Labor Day off)

```
Tue 9/1: Chicken Nuggets + French Fries, Apple Slices
Wed 9/2: Pizza + Green Beans, Roll + [Reuben]
Thu 9/3: Tacos + Corn + Grandparents Day
Tue 9/8: Spaghetti + Mashed Potatoes, Roll
```

## Implementation

The generator is the pure function `MenuData.generateTxt(menu, month, year)`
in `js/menu-data.js`, unit-tested in `tests/menu-data.test.js`.
