import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '@/lib/db';

/**
 * The admin reports, read from database/queries.sql.
 *
 * That file is the single source: each `-- name:` block there is parsed here
 * and run as written, so the SQL handed in with the coursework is the SQL the
 * page executes. The blocks take no parameters (they are fixed questions,
 * windowed with CURDATE()), so nothing from a request ever reaches them.
 */

export interface NamedQuery {
  name: string;
  title: string;
  purpose: string;
  uses: string;
  sql: string;
}

export interface ReportResult extends NamedQuery {
  columns: string[];
  rows: Record<string, unknown>[];
}

const QUERIES_FILE = path.join(process.cwd(), 'database', 'queries.sql');

let cache: Promise<NamedQuery[]> | null = null;

/** Parses the named blocks. Exported for the test that keeps the file honest. */
export function parseNamedQueries(text: string): NamedQuery[] {
  const out: NamedQuery[] = [];
  let current: NamedQuery | null = null;
  const sqlLines: string[] = [];

  const flush = () => {
    if (!current) return;
    current.sql = sqlLines.join('\n').trim().replace(/;\s*$/, '');
    out.push(current);
    sqlLines.length = 0;
  };

  for (const line of text.split(/\r?\n/)) {
    const meta = /^--\s*(name|title|purpose|uses):\s*(.+)$/.exec(line.trim());
    if (meta) {
      const [, key, value] = meta as unknown as [string, keyof NamedQuery, string];
      if (key === 'name') {
        flush();
        current = { name: value.trim(), title: '', purpose: '', uses: '', sql: '' };
      } else if (current) {
        current[key] = value.trim();
      }
      continue;
    }
    if (!current || line.trimStart().startsWith('--')) continue;
    sqlLines.push(line);
  }
  flush();
  return out;
}

export function loadNamedQueries(): Promise<NamedQuery[]> {
  // Re-read in development so editing the file shows up on reload.
  if (!cache || process.env.NODE_ENV !== 'production') {
    cache = readFile(QUERIES_FILE, 'utf8').then(parseNamedQueries);
  }
  return cache;
}

export async function runReport(named: NamedQuery): Promise<ReportResult> {
  const rows = await query<RowDataPacket>(named.sql);
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return { ...named, columns, rows: rows as Record<string, unknown>[] };
}

/** Runs the named reports, in the order asked for. Unknown names are skipped. */
export async function runReports(names: readonly string[]): Promise<ReportResult[]> {
  const all = await loadNamedQueries();
  const picked = names
    .map((n) => all.find((q) => q.name === n))
    .filter((q): q is NamedQuery => q !== undefined);
  return Promise.all(picked.map(runReport));
}
