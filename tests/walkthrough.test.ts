import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELATIONAL_SCHEMA } from '../lib/database-walkthrough.ts';

/**
 * The relational schema shown on /admin/database is written by hand. This
 * holds it to database/schema.sql: every table and column it names must be
 * declared there, and every table there must be listed.
 */
const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');

function declaredColumns(table: string): Set<string> {
  const block = new RegExp(String.raw`CREATE TABLE ${table} \(([\s\S]*?)\n\) ENGINE`).exec(schema)?.[1] ?? '';
  return new Set(
    [...block.matchAll(/^\s{2}([a-z_]+)\s+[A-Z]/gm)].map((m) => m[1]!).filter((c) => c !== 'PRIMARY'),
  );
}

test('every table in schema.sql is in the relational schema, and every column exists', () => {
  const declared = [...schema.matchAll(/^CREATE TABLE (\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(RELATIONAL_SCHEMA.map((t) => t.table).sort(), [...declared].sort());
  for (const t of RELATIONAL_SCHEMA) {
    const cols = declaredColumns(t.table);
    for (const c of [...t.pk, ...t.columns]) assert.ok(cols.has(c), `${t.table}.${c} is not in schema.sql`);
    assert.equal(cols.size, t.pk.length + t.columns.length, `${t.table} lists ${t.pk.length + t.columns.length} columns, schema.sql has ${cols.size}`);
  }
});
