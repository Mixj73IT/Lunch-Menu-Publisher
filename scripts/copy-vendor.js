/**
 * copy-vendor.js
 *
 * Copies the vendored UMD bundles (jsPDF + html2canvas) from node_modules
 * into js/vendor/ so index.html can load them with plain <script> tags.
 *
 * Runs automatically after `npm install` (see package.json "postinstall")
 * and can be run manually with `npm run copy:vendor`.
 *
 * The bundles are kept in node_modules (already declared in package.json
 * devDependencies) rather than committed, so `npm install` is the single
 * source of truth for frontend library versions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'js', 'vendor');

const SOURCES = [
    {
        from: path.join(ROOT, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js'),
        to: path.join(VENDOR_DIR, 'jspdf.umd.min.js')
    },
    {
        from: path.join(ROOT, 'node_modules', 'html2canvas', 'dist', 'html2canvas.min.js'),
        to: path.join(VENDOR_DIR, 'html2canvas.min.js')
    }
];

function main() {
    fs.mkdirSync(VENDOR_DIR, { recursive: true });

    let copied = 0;
    let missing = 0;

    for (const { from, to } of SOURCES) {
        if (!fs.existsSync(from)) {
            console.warn(`[copy-vendor] WARNING: source not found: ${from}`);
            console.warn('[copy-vendor] Run `npm install` to restore frontend dependencies.');
            missing++;
            continue;
        }
        fs.copyFileSync(from, to);
        copied++;
        console.log(`[copy-vendor] Copied ${path.basename(from)} -> js/vendor/`);
    }

    if (missing > 0) {
        // Non-fatal: the app still runs, PDF generation just won't be available.
        console.warn('[copy-vendor] Some vendor bundles are missing; automatic PDF generation may be unavailable.');
    }

    if (copied === 0 && missing === 0) {
        console.warn('[copy-vendor] Nothing to do.');
    }
}

main();
