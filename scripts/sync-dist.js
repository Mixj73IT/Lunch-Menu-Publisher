/**
 * sync-dist.js — rebuild the Tauri frontend bundle (dist/) from source.
 *
 * Used as the Tauri `beforeBuildCommand` so every build embeds a fresh,
 * self-consistent frontend. The previous one-line PowerShell command was
 * silently broken when invoked through cmd /C (the quoted command was echoed
 * and never executed), which let stale dist files ship in built apps.
 *
 * This script resolves the project root from its own location (CWD
 * independent) and rebuilds dist/ from scratch, removing stale files such as
 * removed scripts that would otherwise linger in published apps.
 *
 * BUILD GUARD: the app generates PDFs with the vendored jspdf + html2canvas
 * UMD bundles (js/vendor/). They are NOT committed — `npm install` copies
 * them from node_modules via scripts/copy-vendor.js. A build made without
 * them ships an app whose PDF generation silently reports "missing
 * components". This script therefore FAILS the build when they are absent,
 * so a broken MSI can never be produced again.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_VENDOR_BUNDLES = ['jspdf.umd.min.js', 'html2canvas.min.js'];

// Sources to bundle into the app. Any that exist are copied recursively.
const SOURCES = ['index.html', 'css', 'js', 'data', 'fonts', 'images'];

function syncDist(root) {
    const dist = path.join(root, 'dist');
    const vendorDir = path.join(root, 'js', 'vendor');

    // --- Build guard: refuse to ship without the PDF bundles -----------
    const missing = REQUIRED_VENDOR_BUNDLES.filter(
        (name) => !fs.existsSync(path.join(vendorDir, name))
    );
    if (missing.length > 0) {
        throw new Error(
            `[sync-dist] MISSING PDF vendor bundle(s) in js/vendor: ${missing.join(', ')}. ` +
            'Run `npm install` first (it copies the bundles from node_modules via ' +
            'scripts/copy-vendor.js), then rebuild. The installed app cannot ' +
            'generate PDFs without them.'
        );
    }

    // Remove the old bundle entirely so no stale files survive.
    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(dist, { recursive: true });

    let copied = 0;
    for (const item of SOURCES) {
        const src = path.join(root, item);
        if (!fs.existsSync(src)) {
            console.warn(`sync-dist: skipping missing source ${item}`);
            continue;
        }
        fs.cpSync(src, path.join(dist, item), { recursive: true });
        copied++;
    }

    return { dist, copied };
}

module.exports = { syncDist, REQUIRED_VENDOR_BUNDLES };

if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    try {
        const { dist, copied } = syncDist(root);
        console.log(`sync-dist: rebuilt ${dist} from ${copied} sources`);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
