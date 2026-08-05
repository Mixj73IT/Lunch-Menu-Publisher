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
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

// Sources to bundle into the app. Any that exist are copied recursively.
const SOURCES = ['index.html', 'css', 'js', 'data', 'fonts', 'images'];

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

console.log(`sync-dist: rebuilt ${dist} from ${copied} sources`);
