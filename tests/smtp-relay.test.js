/**
 * Unit tests for relay-mode SMTP semantics in js/state.js.
 * Run with: npm test (uses Node's built-in test runner, no extra deps).
 *
 * state.js is browser-oriented (top-level `const State`, window/localStorage),
 * so it is evaluated in a minimal VM sandbox with a fake localStorage and a
 * fake window, and the REAL State object is exercised — no mirrored logic.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STATE_SOURCE = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'state.js'),
    'utf8'
);

/** Fake localStorage backed by a Map. */
function fakeStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
    };
}

/** Evaluate state.js, return the real State object (after loadAll()). */
function loadState(storageOverrides) {
    const storage = fakeStorage();
    if (storageOverrides) {
        for (const [k, v] of Object.entries(storageOverrides)) {
            storage.setItem(k, JSON.stringify(v));
        }
    }
    const sandbox = { window: {}, localStorage: storage, console };
    vm.createContext(sandbox);
    const State = vm.runInContext(STATE_SOURCE + '\n;State;', sandbox, {
        filename: 'state.js'
    });
    State.loadAll();
    return State;
}

test('mode defaults to relay on a fresh install', () => {
    const State = loadState();
    assert.equal(State.smtpIsRelayMode(), true);
});

test('auth mode: smtpIsRelayMode is false after switching', () => {
    const State = loadState();
    State.setSmtpMode('auth');
    assert.equal(State.smtpIsRelayMode(), false);
});

test('relay mode: ready with host + from, no credentials', () => {
    const State = loadState();
    State.smtpHost = 'smtp-relay.gmail.com';
    State.smtpFrom = 'lunchmenu@school.org';
    assert.equal(State.smtpReady(), true);
});

test('relay mode: not ready without a From address', () => {
    const State = loadState();
    State.smtpHost = 'smtp-relay.gmail.com';
    State.smtpFrom = '';
    assert.equal(State.smtpReady(), false);
});

test('authenticated mode: ready with host + user + password even without From', () => {
    const State = loadState();
    State.setSmtpMode('auth');
    State.smtpHost = 'smtp.gmail.com';
    State.smtpUser = 'kitchen@school.org';
    State.smtpPassword = 'app-password';
    State.smtpFrom = '';
    assert.equal(State.smtpReady(), true);
});

test('authenticated mode: missing password blocks readiness', () => {
    const State = loadState();
    State.setSmtpMode('auth');
    State.smtpHost = 'smtp.gmail.com';
    State.smtpUser = 'kitchen@school.org';
    State.smtpPassword = '';
    State.smtpFrom = 'lunchmenu@school.org';
    assert.equal(State.smtpReady(), false);
});

test('no host blocks readiness in both modes', () => {
    const State = loadState();
    State.smtpHost = '';
    State.smtpFrom = 'lunchmenu@school.org';
    assert.equal(State.smtpReady(), false);

    State.setSmtpMode('auth');
    State.smtpUser = 'kitchen@school.org';
    State.smtpPassword = 'app-password';
    State.smtpFrom = '';
    assert.equal(State.smtpReady(), false);
});

test('setSmtpMode relay clears credentials; auth keeps fields', () => {
    const State = loadState();
    State.smtpUser = 'kitchen@school.org';
    State.smtpPassword = 'app-pass';
    State.setSmtpMode('relay');
    assert.equal(State.smtpMode, 'relay');
    assert.equal(State.smtpUser, '');
    assert.equal(State.smtpPassword, '');

    State.setSmtpMode('auth');
    assert.equal(State.smtpMode, 'auth');
    // switching back does not fabricate credentials
    assert.equal(State.smtpUser, '');
    assert.equal(State.smtpPassword, '');
});

test('setSmtpMode ignores invalid values', () => {
    const State = loadState();
    State.setSmtpMode('nonsense');
    assert.ok(['relay', 'auth'].includes(State.smtpMode));
});

test('legacy installs default to auth mode when credentials exist', () => {
    const State = loadState({
        lunchMenu_smtpUser: 'kitchen@school.org',
        lunchMenu_smtpPassword: 'secret'
    });
    assert.equal(State.smtpMode, 'auth');
});

test('existing saved mode survives reload', () => {
    const State = loadState({ lunchMenu_smtpMode: 'relay' });
    assert.equal(State.smtpMode, 'relay');
});

test('smtpFrom round-trips through saveSmtpFrom + localStorage', () => {
    const storage = fakeStorage();
    const sandbox = { window: {}, localStorage: storage, console };
    vm.createContext(sandbox);
    const State = vm.runInContext(STATE_SOURCE + '\n;State;', sandbox, {
        filename: 'state.js'
    });
    State.smtpFrom = 'lunchmenu@school.org';
    State.saveSmtpFrom();
    assert.equal(
        storage.getItem('lunchMenu_smtpFrom'),
        JSON.stringify('lunchmenu@school.org')
    );
});
