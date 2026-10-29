#!/usr/bin/env node
/**
 * Copy lint.
 *
 * The em-dash ban is the most-violated rule in this kind of work and it is
 * mechanically checkable, so it should not depend on anyone remembering it.
 *
 * Scans source only. The markdown docs are excluded because DESIGN.md has to
 * name the banned characters in order to ban them.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const ROOTS = ['app', 'components', 'lib', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']);

const BANNED = [
  { char: '—', name: 'em dash (U+2014)', fix: 'Use a hyphen, a comma, a colon, or two sentences.' },
  { char: '–', name: 'en dash (U+2013)', fix: 'Use a plain hyphen for ranges.' },
];

/** This file necessarily contains the characters it bans. */
const SELF = 'scripts/lint-copy.mjs';

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      yield* walk(full);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

const violations = [];

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = relative(process.cwd(), file).replace(/\\/g, '/');
    if (rel === SELF) continue;

    const source = await readFile(file, 'utf8');
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const { char, name, fix } of BANNED) {
        let column = line.indexOf(char);
        while (column !== -1) {
          violations.push({
            file: rel,
            line: index + 1,
            column: column + 1,
            name,
            fix,
            excerpt: line.trim().slice(0, 100),
          });
          column = line.indexOf(char, column + 1);
        }
      }
    });
  }
}

if (violations.length === 0) {
  console.log('copy lint: clean, no banned dash characters found');
  process.exit(0);
}

console.error(`\ncopy lint: ${violations.length} violation(s)\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}:${v.column}  ${v.name}`);
  console.error(`    ${v.excerpt}`);
  console.error(`    ${v.fix}\n`);
}
process.exit(1);
