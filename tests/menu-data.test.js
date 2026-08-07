/**
 * Unit tests for js/menu-data.js (pure data layer).
 * Run with: npm test  (uses Node's built-in test runner, no extra deps)
 *
 * Test month: September 2026. September 1, 2026 is a Tuesday.
 * Weekends: Sep 5, 6, 12, 13, 19, 20, 26, 27 (Sat/Sun).
 * Weekdays: 22 total; with Sep 7 (Mon) marked NO SCHOOL -> 21 instructional days.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const MenuData = require('../js/menu-data.js');

const YEAR = 2026;
const MONTH = 8; // September (0-based)

function baseMenu() {
    const days = {};
    const set = (day, data) => {
        days[MenuData.dateKey(YEAR, MONTH, day)] = data;
    };
    return { set, days, menu() { return { month: MONTH, year: YEAR, days, verse: null }; } };
}

/**
 * Fixture for the missing-entrée / plan tests: every instructional day has an
 * entrée except Sep 8 -> exactly 1 missing (Sep 2026: 21 instructional days).
 */
function sampleMenu() {
    const b = baseMenu();
    b.set(1, { entree: 'Pizza', sides: ['Green Beans', 'Roll'], special: 'Reuben', specialEvent: 'Bake Sale' });
    b.set(2, { entree: 'Tacos', sides: [] });
    b.set(3, { entree: 'Chicken Sandwich', specialEvent: 'Grandparents Day' });
    b.set(4, { entree: 'Hot Dog' });
    b.set(7, { isNoSchool: true, entree: 'Should Be Ignored' });
    b.set(8, { sides: ['Corn'] }); // missing entrée
    [9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30].forEach(day =>
        b.set(day, { entree: `Entree ${day}`, sides: ['Corn'] })
    );
    return b.menu();
}

/**
 * Fixture for the TXT format test: Sep 1 full, Sep 2 entrée-only, Sep 3 event-only,
 * Sep 4 empty, Sep 7 NO SCHOOL, Sep 8 sides-only -> 4 lines.
 */
function txtFixture() {
    const b = baseMenu();
    b.set(1, { entree: 'Pizza', sides: ['Green Beans', 'Roll'], special: 'Reuben', specialEvent: 'Bake Sale' });
    b.set(2, { entree: 'Tacos', sides: [] });
    b.set(3, { specialEvent: 'Grandparents Day' });
    b.set(4, {});
    b.set(7, { isNoSchool: true, entree: 'Should Be Ignored' });
    b.set(8, { sides: ['Corn'] });
    return b.menu();
}

test('countDaysMissingEntree counts instructional weekdays without an entrée', () => {
    const menu = sampleMenu();
    // 21 instructional days, 1 without an entrée (Sep 8).
    assert.equal(MenuData.countDaysMissingEntree(menu, MONTH, YEAR), 1);
});

test('countDaysMissingEntree ignores weekends, NO SCHOOL and empty months', () => {
    // Sep 2026 has 22 weekdays, none marked NO SCHOOL -> 22 missing.
    assert.equal(MenuData.countDaysMissingEntree({ month: MONTH, year: YEAR, days: {} }, MONTH, YEAR), 22);
    // All NO SCHOOL -> 0 missing
    const allNoSchool = {};
    for (let d = 1; d <= 30; d++) allNoSchool[MenuData.dateKey(YEAR, MONTH, d)] = { isNoSchool: true };
    assert.equal(MenuData.countDaysMissingEntree({ month: MONTH, year: YEAR, days: allNoSchool }, MONTH, YEAR), 0);
});

test('generateTxt includes only instructional days with content, in the documented format', () => {
    const txt = MenuData.generateTxt(txtFixture(), MONTH, YEAR);
    const lines = txt.split('\n');

    assert.equal(lines[0], 'Tue 9/1: Pizza + Green Beans, Roll + [Reuben] + Bake Sale');
    assert.equal(lines[1], 'Wed 9/2: Tacos');
    assert.equal(lines[2], 'Thu 9/3: Grandparents Day');

    // Excludes: weekend (Sep 5), NO SCHOOL (Sep 7), empty (Sep 4), missing-entrée-only (Sep 8 has sides? no - excluded because sides-only is content)
    // Sep 8 has sides: ['Corn'] -> content = "Corn" -> included.
    assert.equal(lines.length, 4, `expected 4 lines, got ${lines.length}: ${JSON.stringify(lines)}`);
    assert.ok(!txt.includes('Should Be Ignored'), 'NO SCHOOL day content must not appear');
    assert.ok(!txt.includes('Sat'), 'weekends must be excluded');
    assert.ok(!txt.includes('Sun'), 'weekends must be excluded');
});

test('generateTxt returns empty string when nothing to export', () => {
    assert.equal(MenuData.generateTxt({ days: {} }, MONTH, YEAR), '');
    const onlyWeekend = {
        days: { [MenuData.dateKey(YEAR, MONTH, 5)]: { entree: 'Pizza' } } // Sep 5 = Sat
    };
    assert.equal(MenuData.generateTxt(onlyWeekend, MONTH, YEAR), '');
});

test('buildMenuJson emits the V4 contract both consumers parse', () => {
    const publishedAt = '2026-09-02T12:00:00.000Z';
    const menu = { ...sampleMenu(), verse: { text: 'Give thanks', reference: '1 Thess 5:18' } };
    const json = MenuData.buildMenuJson(menu, MONTH, YEAR, publishedAt, true);

    assert.equal(json.version, 4);
    assert.equal(json.generated, publishedAt);
    assert.equal(json.publishedAt, publishedAt);
    assert.equal(json.month, 9, 'month must be 1-based');
    assert.equal(json.year, 2026);
    assert.deepEqual(json.verse, { text: 'Give thanks', reference: '1 Thess 5:18' });

    // The "menu" array is the consumer contract: MenuSync.gs hard-fails
    // without it, and the kiosk matches entries by date.
    assert.ok(Array.isArray(json.menu), 'menu must be an array');
    assert.equal(json.menu.length, 30, 'every calendar day of the month is present');

    // Consistent key set on every entry - no omitted fields.
    const expectedKeys = ['date', 'day', 'entree', 'special', 'sides', 'event', 'noSchool'];
    for (const entry of json.menu) {
        assert.deepEqual(Object.keys(entry).sort(), expectedKeys.slice().sort(), `day ${entry.date}`);
    }

    // Weekends and NO SCHOOL days flagged.
    const byDate = Object.fromEntries(json.menu.map(d => [d.date, d]));
    assert.equal(byDate['2026-09-01'].day, 'Tuesday');
    assert.equal(byDate['2026-09-05'].noSchool, true, 'Saturday');
    assert.equal(byDate['2026-09-06'].noSchool, true, 'Sunday');
    assert.equal(byDate['2026-09-07'].noSchool, true, 'Labor Day');
    assert.equal(byDate['2026-09-01'].noSchool, false);

    // Content mapping (special is singular, matching the consumer contract).
    assert.equal(byDate['2026-09-01'].entree, 'Pizza');
    assert.deepEqual(byDate['2026-09-01'].sides, ['Green Beans', 'Roll']);
    assert.equal(byDate['2026-09-01'].special, 'Reuben');
    assert.equal(byDate['2026-09-01'].event, 'Bake Sale');

    // NO SCHOOL day content is always empty: the noSchool flag is authoritative.
    assert.equal(byDate['2026-09-07'].entree, '');
    assert.deepEqual(byDate['2026-09-07'].sides, []);
    assert.equal(byDate['2026-09-07'].special, '');
    assert.equal(byDate['2026-09-07'].event, '');

    // Date strings are 'yyyy-MM-dd' — the format MenuSync.gs and the kiosk match.
    assert.match(byDate['2026-09-15'].date, /^\d{4}-\d{2}-\d{2}$/);
});

test('V4 menu round-trips through the kiosk and MenuSync consumer logic', () => {
    const json = MenuData.buildMenuJson(sampleMenu(), MONTH, YEAR, '2026-09-02T00:00:00.000Z', true);

    // MenuSync.gs gate: it hard-aborts unless Array.isArray(json.menu).
    assert.ok(Array.isArray(json.menu));

    // Kiosk getDailyMenu(): finds today's entry by date, maps entree -> mainCourse.
    const today = '2026-09-01';
    const entry = json.menu.find(e => e.date === today);
    assert.ok(entry, 'kiosk must find today by date');
    const dailyMenu = {
        mainCourse: typeof entry.entree === 'string' ? entry.entree : "Today's Hot Lunch",
        special: typeof entry.special === 'string' ? entry.special : ''
    };
    assert.equal(dailyMenu.mainCourse, 'Pizza');
    assert.equal(dailyMenu.special, 'Reuben');

    // MenuSync.gs row fields: date | day | entree | special.
    assert.equal(entry.date, '2026-09-01');
    assert.equal(entry.day, 'Tuesday');
    assert.equal(entry.entree, 'Pizza');
    assert.equal(entry.special, 'Reuben');

    // saladBar/sackLunch are intentionally absent: the publisher never
    // references the salad bar (Option A — defaults apply downstream).
    assert.equal('saladBar' in entry, false);
    assert.equal('sackLunch' in entry, false);
});

test('buildMenuJson omits the verse when verses are disabled', () => {
    const menu = { ...sampleMenu(), verse: { text: 'x', reference: 'y' } };
    const json = MenuData.buildMenuJson(menu, MONTH, YEAR, '2026-09-02T00:00:00.000Z', false);
    assert.equal(json.verse, null);
});

test('buildPublishPlan blocks publishing without a menu.json destination (desktop)', () => {
    const plan = MenuData.buildPublishPlan(sampleMenu(), MONTH, YEAR, { versesEnabled: true }, {
        menuJsonFolder: '',
        staffEmail: '',
        smtpComplete: false,
        browserMode: false
    });

    assert.equal(plan.monthLabel, 'September 2026');
    assert.equal(plan.fileName, 'Lunch Menu - September 2026');
    assert.equal(plan.missingEntreeCount, 1);
    assert.equal(plan.instructionalDays, 21);
    assert.equal(plan.canPublish, false);
    assert.ok(plan.warnings.some(w => w.includes('menu.json destination')));
    assert.ok(plan.warnings.some(w => w.includes('no entrée')));
    assert.ok(plan.warnings.some(w => w.includes('staff-office email')));
});

test('buildPublishPlan allows publishing when configured; warns on missing entrées only', () => {
    const plan = MenuData.buildPublishPlan(sampleMenu(), MONTH, YEAR, { versesEnabled: true }, {
        menuJsonFolder: 'C:/Drive/Menus',
        staffEmail: 'office@school.org',
        smtpComplete: true,
        browserMode: false
    });

    assert.equal(plan.canPublish, true);
    assert.ok(plan.jsonDeliveryLabel.includes('C:/Drive/Menus'));
    assert.ok(plan.emailDeliveryLabel.includes('office@school.org'));
    // Only the missing-entrée warning remains.
    assert.equal(plan.warnings.length, 1);
});

test('buildPublishPlan browser mode allows publish with download fallback', () => {
    const plan = MenuData.buildPublishPlan(sampleMenu(), MONTH, YEAR, { versesEnabled: true }, {
        menuJsonFolder: '',
        staffEmail: 'office@school.org',
        smtpComplete: false,
        browserMode: true
    });

    assert.equal(plan.canPublish, true);
    assert.ok(plan.jsonDeliveryLabel.includes('download'));
    assert.ok(plan.warnings.some(w => w.includes('desktop app')));
});

test('buildPublishPlan flags incomplete SMTP only when email is configured', () => {
    const plan = MenuData.buildPublishPlan(sampleMenu(), MONTH, YEAR, { versesEnabled: true }, {
        menuJsonFolder: 'C:/Drive/Menus',
        staffEmail: 'office@school.org',
        smtpComplete: false,
        browserMode: false
    });
    assert.ok(plan.warnings.some(w => w.includes('SMTP')));
});

test('buildVerdict never claims success when menu.json was not written', () => {
    // The core publish guarantee: jsonWritten=false must yield a failure verdict.
    const failed = MenuData.buildVerdict(false, 'September 2026');
    assert.ok(failed.includes('did not complete successfully'));
    assert.ok(failed.includes('menu.json was not written'));
    assert.ok(!failed.includes('Publishing complete'));

    const ok = MenuData.buildVerdict(true, 'September 2026');
    assert.ok(ok.includes('Publishing complete'));
    assert.ok(ok.includes('September 2026'));
});
