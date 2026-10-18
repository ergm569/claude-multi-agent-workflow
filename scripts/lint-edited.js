#!/usr/bin/env node
// PostToolUse hook: lint the JavaScript file Claude just wrote or edited.
// Exits 2 with ESLint's output on stderr when the file has lint errors, so
// Claude sees them and fixes them. Exits 0 (silently) in every other case:
// not a JS file, no ESLint config or no local ESLint install, warnings only.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const JS_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

// Walk up from the file's folder to the closest folder with an ESLint config.
function findConfigDir(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'eslint.config.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const input = readStdin();
const toolInput = input.tool_input || {};
let filePath = toolInput.file_path;
if (!filePath || !JS_EXTENSIONS.has(path.extname(filePath))) process.exit(0);
if (!path.isAbsolute(filePath)) filePath = path.resolve(input.cwd || process.cwd(), filePath);
if (!fs.existsSync(filePath)) process.exit(0);

const configDir = findConfigDir(path.dirname(filePath));
if (!configDir) process.exit(0);

const eslintBin = path.join(configDir, 'node_modules', 'eslint', 'bin', 'eslint.js');
if (!fs.existsSync(eslintBin)) process.exit(0);

const result = spawnSync(process.execPath, [eslintBin, '--no-warn-ignored', filePath], {
  cwd: configDir,
  encoding: 'utf8',
  timeout: 50000,
});

// ESLint exits 1 when there are lint errors (warnings alone exit 0).
if (result.status === 1) {
  process.stderr.write('ESLint found errors in ' + path.relative(configDir, filePath) + ':\n');
  process.stderr.write(result.stdout || result.stderr || '');
  process.exit(2);
}
process.exit(0);
