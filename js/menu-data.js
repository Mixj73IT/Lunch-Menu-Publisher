/**
 * MenuData - Pure menu data helpers.
 *
 * This module contains NO DOM access and NO localStorage access, so it can be
 * unit-tested with Node's built-in test runner (see tests/) and reused by any
 * consumer (browser, publish flow, external scripts).
 *
 * Exports:
 *   MONTH_NAMES, pad2, dateKey, daysInMonth, isWeekend, getDayData,
 *   countDaysMissingEntree, generateTxt, buildMenuJson, buildFileName,
 *   buildPublishPlan
 *
 * Month convention: month is 0-based everywhere in the app (January = 0) and
 * 1-based in the published menu.json (January = 1) — documented in MENU_JSON.md.
 */

const MenuData = (function () {
    'use strict';

    const MONTH_NAMES = Object.freeze([
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]);

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    /** ISO date key used for the current day's menu data, e.g. "2026-09-01". */
    function dateKey(year, month, day) {
        return `${year}-${pad2(month + 1)}-${pad2(day)}`;
    }

    function daysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    function isWeekend(year, month, day) {
        const d = new Date(year, month, day);
        const dow = d.getDay();
        return dow === 0 || dow === 6;
    }

    /** Day record from the menu, defaulting to a consistent empty record. */
    function getDayData(menu, year, month, day) {
        const key = dateKey(year, month, day);
        const d = (menu && menu.days && menu.days[key]) || {};
        return {
            date: key,
            entree: typeof d.entree === 'string' ? d.entree : '',
            sides: Array.isArray(d.sides) ? d.sides : [],
            special: typeof d.special === 'string' ? d.special : '',
            specialEvent: typeof d.specialEvent === 'string' ? d.specialEvent : '',
            isNoSchool: !!d.isNoSchool
        };
    }

    /** True when the day is not a school day (weekend or marked NO SCHOOL). */
    function isNonSchoolDay(menu, year, month, day) {
        if (isWeekend(year, month, day)) return true;
        const d = (menu && menu.days && menu.days[dateKey(year, month, day)]) || {};
        return !!d.isNoSchool;
    }

    /** True when the day has no menu content at all (no entrée/sides/special/event). */
    function isDayEmpty(dayData) {
        return (
            !dayData.entree &&
            (!dayData.sides || dayData.sides.length === 0) &&
            !dayData.special &&
            !dayData.specialEvent
        );
    }

    /**
     * Number of instructional days (weekday, not NO SCHOOL) that have no entrée.
     * Used for the "incomplete instructional days" warning.
     */
    function countDaysMissingEntree(menu, month, year) {
        let count = 0;
        for (let day = 1; day <= daysInMonth(year, month); day++) {
            if (isNonSchoolDay(menu, year, month, day)) continue;
            const d = getDayData(menu, year, month, day);
            if (!d.entree) count++;
        }
        return count;
    }

    /**
     * Plain-text export for FACTS / RenWeb.
     *
     * Format (one line per instructional day with content):
     *   `Mon 9/1: Pizza + Green Beans, Roll + [Reuben] + Bake Sale`
     *
     * - Weekdays only (weekends and NO SCHOOL days excluded)
     * - Empty days excluded
     * - Entrée first, sides joined with ", ", all items joined with " + "
     * - Specials (teacher/12th-grade offerings) wrapped in square brackets
     * - Event notes appended as plain text
     * - Milk is NOT included: it is a fixed school staple handled separately
     */
    function generateTxt(menu, month, year) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const lines = [];

        for (let day = 1; day <= daysInMonth(year, month); day++) {
            if (isNonSchoolDay(menu, year, month, day)) continue;

            const d = getDayData(menu, year, month, day);
            if (isDayEmpty(d)) continue;

            const dow = new Date(year, month, day).getDay();
            const dateStr = `${dayNames[dow]} ${month + 1}/${day}`;

            let content = d.entree || '';
            if (d.sides && d.sides.length > 0) {
                content += (content ? ' + ' : '') + d.sides.join(', ');
            }
            if (d.special) {
                content += (content ? ' + ' : '') + `[${d.special}]`;
            }
            if (d.specialEvent) {
                content += (content ? ' + ' : '') + d.specialEvent;
            }

            if (content) {
                lines.push(`${dateStr}: ${content}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Build the stable menu.json snapshot consumed by other local projects.
     *
     * Schema (see MENU_JSON.md):
     * {
     *   "schemaVersion": 1,
     *   "publishedAt":   "2026-09-01T12:34:56.789Z",
     *   "month":         9,            // 1-based
     *   "year":          2026,
     *   "verse":         { text, reference } | null,
     *   "days": [
     *     { "date": "2026-09-01", "entree": "...", "sides": [...],
     *       "specials": "...", "event": "...", "noSchool": false }
     *   ]
     * }
     *
     * Every calendar day of the month is included. Weekends and NO SCHOOL days
     * have noSchool: true and empty entries. Empty strings/arrays are used
     * consistently — no omitted keys.
     */
    function buildMenuJson(menu, month, year, publishedAt, versesEnabled) {
        const days = [];
        for (let day = 1; day <= daysInMonth(year, month); day++) {
            const noSchool = isNonSchoolDay(menu, year, month, day);
            const d = getDayData(menu, year, month, day);
            // On non-school days the entry fields are always empty: the
            // noSchool flag is authoritative and consumers can ignore content.
            days.push({
                date: d.date,
                entree: noSchool ? '' : (d.entree || ''),
                sides: noSchool ? [] : (d.sides || []),
                specials: noSchool ? '' : (d.special || ''),
                event: noSchool ? '' : (d.specialEvent || ''),
                noSchool: noSchool
            });
        }

        const verse =
            versesEnabled && menu.verse && menu.verse.text ? menu.verse : null;

        return {
            schemaVersion: 1,
            publishedAt: publishedAt || new Date().toISOString(),
            month: month + 1, // 1-based in the published schema
            year: year,
            verse: verse,
            days: days
        };
    }

    /** Human-friendly base file name, e.g. "Lunch Menu - September 2026". */
    function buildFileName(month, year) {
        return `Lunch Menu - ${MONTH_NAMES[month]} ${year}`;
    }

    /**
     * Build the publish plan shown in the Publish Month confirmation.
     * Pure function so the confirmation logic is unit-testable.
     *
     * @param {Object} menu     The month's menu object
     * @param {number} month    0-based month
     * @param {number} year     Full year
     * @param {Object} settings App settings (versesEnabled etc.)
     * @param {Object} config   { menuJsonFolder, staffEmail, smtpComplete,
     *                            browserMode }
     * @returns {Object} plan   { month, year, monthLabel, fileName, txt,
     *                           json, missingEntreeCount, instructionalDays,
     *                           hasContent, jsonConfigured, emailConfigured,
     *                           warnings, canPublish, jsonDeliveryLabel,
     *                           emailDeliveryLabel }
     */
    function buildPublishPlan(menu, month, year, settings, config) {
        const cfg = config || {};
        const browserMode = !!cfg.browserMode;
        const txt = generateTxt(menu, month, year);
        const json = buildMenuJson(menu, month, year, new Date().toISOString(), settings.versesEnabled);

        const missingEntreeCount = countDaysMissingEntree(menu, month, year);
        const hasContent = txt.trim().length > 0;
        const jsonConfigured = !!(cfg.menuJsonFolder && cfg.menuJsonFolder.trim());
        const emailConfigured = !!(cfg.staffEmail && cfg.staffEmail.trim());

        const warnings = [];
        if (missingEntreeCount > 0) {
            warnings.push(
                `${missingEntreeCount} instructional day(s) have no entrée yet. You can still publish, but double-check those days first.`
            );
        }
        if (!jsonConfigured) {
            if (browserMode) {
                warnings.push('The sync-folder write of menu.json requires the desktop app. In the browser the file is offered as a download instead.');
            } else {
                warnings.push('No menu.json destination folder is configured. Open Settings and choose a folder before publishing.');
            }
        }
        if (!emailConfigured) {
            warnings.push('No staff-office email recipient is configured. The email step will be skipped.');
        } else if (browserMode) {
            warnings.push('Sending the email requires the desktop app. The email step will be skipped in the browser.');
        } else if (!cfg.smtpComplete) {
            warnings.push('SMTP details are incomplete — sending the email may fail.');
        }
        if (!hasContent) {
            warnings.push('No instructional days have menu content yet — the TXT file will be empty.');
        }

        // menu.json is the required integration output. In the desktop app it
        // must have a configured destination; in the browser it is downloaded.
        const canPublish = browserMode ? true : jsonConfigured;

        return {
            month,
            year,
            monthLabel: `${MONTH_NAMES[month]} ${year}`,
            fileName: buildFileName(month, year),
            txt,
            json,
            missingEntreeCount,
            instructionalDays: daysInMonth(year, month) - countNonSchoolDays(menu, year, month),
            hasContent,
            jsonConfigured,
            emailConfigured,
            browserMode,
            warnings,
            canPublish,
            jsonDeliveryLabel: browserMode
                ? 'menu.json will be downloaded (sync-folder writing requires the desktop app)'
                : (jsonConfigured
                    ? `menu.json will be written to ${cfg.menuJsonFolder}`
                    : 'menu.json will NOT be written — no destination folder configured'),
            emailDeliveryLabel: emailConfigured
                ? `Email will be sent to ${cfg.staffEmail}`
                : 'Email will not be sent — no staff-office recipient configured'
        };
    }

    function countNonSchoolDays(menu, year, month) {
        let count = 0;
        for (let day = 1; day <= daysInMonth(year, month); day++) {
            if (isNonSchoolDay(menu, year, month, day)) count++;
        }
        return count;
    }

    /**
     * The overall publish verdict. The ONLY success condition is that
     * menu.json was actually written — never claim success otherwise.
     */
    function buildVerdict(jsonWritten, monthLabel) {
        if (jsonWritten) {
            return `Publishing complete. ${monthLabel} has been published.`;
        }
        return 'Publishing did not complete successfully — menu.json was not written. Fix the issue and try again.';
    }

    return {
        MONTH_NAMES,
        pad2,
        dateKey,
        daysInMonth,
        isWeekend,
        getDayData,
        isDayEmpty,
        isNonSchoolDay,
        countDaysMissingEntree,
        generateTxt,
        buildMenuJson,
        buildFileName,
        buildPublishPlan,
        buildVerdict
    };
})();

// Node/CommonJS support for unit tests.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuData;
}
