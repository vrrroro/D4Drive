import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseNamedQueries } from '../lib/services/reports.ts';

/**
 * database/queries.sql is read and run by the admin Reports page. These keep
 * it to the rubric (at least 15 meaningful queries) and keep every block
 * runnable: a typo there is otherwise only found by opening the page.
 */

const text = await readFile(new URL('../database/queries.sql', import.meta.url), 'utf8');
const queries = parseNamedQueries(text);

test('queries.sql has at least 15 named queries, each fully described', () => {
  assert.ok(queries.length >= 15, `only ${queries.length} queries`);
  assert.equal(new Set(queries.map((q) => q.name)).size, queries.length, 'names must be unique');
  for (const q of queries) {
    assert.ok(q.title && q.purpose && q.uses, `${q.name} is missing a title, purpose or uses line`);
    assert.match(q.sql, /^SELECT\b/i, `${q.name} must be a single SELECT`);
    assert.ok(!q.sql.includes(';'), `${q.name} must be one statement`);
    assert.ok(!q.sql.includes('?'), `${q.name} must not take parameters`);
  }
});

const CONFIGURED = Boolean(process.env.DB_NAME && process.env.DB_HOST);

test('every named query runs against the database', { skip: !CONFIGURED && 'no database configured' }, async () => {
  const { runReport } = await import('../lib/services/reports.ts');
  const { pool } = await import('../lib/db.ts');
  try {
    for (const q of queries) {
      const result = await runReport(q);
      assert.ok(Array.isArray(result.rows), q.name);
    }
  } finally {
    await pool.end();
  }
});
