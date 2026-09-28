'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
    'server.js',
    'database.js',
    'schema.sql',
    'index.html',
    'style.css',
    'package.json',
    'docs/PROJECT_STATE.md',
    'docs/ARCHITECTURE.md',
    'docs/IMPLEMENTATION_PLAN.md',
    'docs/SECURITY.md',
    'docs/TESTING.md',
    'docs/DECISIONS.md',
];

const ignoredDirs = new Set(['node_modules', '.git', 'uploads']);
const jsFiles = [];

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(fullPath);
    }
}

let failed = false;

for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file))) {
        console.error(`[verify] missing required file: ${file}`);
        failed = true;
    }
}

walk(root);

for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], {
        cwd: root,
        encoding: 'utf8',
    });
    if (result.status !== 0) {
        console.error(`[verify] syntax failed: ${path.relative(root, file)}`);
        console.error((result.stderr || result.stdout || '').trim());
        failed = true;
    }
}

if (failed) process.exit(1);

console.log(`[verify] required files: ${requiredFiles.length} passed`);
console.log(`[verify] JavaScript syntax: ${jsFiles.length} files passed`);
console.log('[verify] baseline verification passed');
