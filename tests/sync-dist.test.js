/**
 * Unit tests for scripts/sync-dist.js (build guard + dist bundling).
 * Run with: npm test (uses Node's built-in test runner, no extra deps).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { syncDist, REQUIRED_VENDOR_BUNDLES } = require('../scripts/sync-dist.js');

/** Build a fake project root: index.html + js/app.js + optional vendor bundles. */
function fakeProject({ withVendor }) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lunchmenu-syncdist-'));
    fs.mkdirSync(path.join(root, 'js'), { recursive: true });
    fs.writeFileSync(path.join(root, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(root, 'js', 'app.js'), '// app');
    if (withVendor) {
        fs.mkdirSync(path.join(root, 'js', 'vendor'), { recursive: true });
        for (const name of REQUIRED_VENDOR_BUNDLES) {
            fs.writeFileSync(path.join(root, 'js', 'vendor', name), '// bundle');
        }
    }
    return root;
}

test('syncDist fails when PDF vendor bundles are missing', () => {
    const root = fakeProject({ withVendor: false });
    assert.throws(() => syncDist(root), /MISSING PDF vendor bundle/);
    assert.equal(fs.existsSync(path.join(root, 'dist')), false, 'no dist on failure');
    fs.rmSync(root, { recursive: true, force: true });
});

test('syncDist succeeds and bundles the frontend when vendor bundles exist', () => {
    const root = fakeProject({ withVendor: true });
    const { dist, copied } = syncDist(root);
    assert.equal(copied, 2, 'index.html + js copied');
    assert.equal(fs.existsSync(path.join(dist, 'index.html')), true);
    assert.equal(
        fs.existsSync(path.join(dist, 'js', 'vendor', 'jspdf.umd.min.js')),
        true,
        'vendor bundles reach dist/'
    );
    fs.rmSync(root, { recursive: true, force: true });
});

test('syncDist clears stale files from a previous dist', () => {
    const root = fakeProject({ withVendor: true });
    const dist = path.join(root, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, 'stale-file.js'), '// old build junk');
    syncDist(root);
    assert.equal(fs.existsSync(path.join(dist, 'stale-file.js')), false, 'stale file removed');
    fs.rmSync(root, { recursive: true, force: true });
});
