import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '@/lib/db';
import { parseNamedQueries, type NamedQuery } from '@/lib/services/named-queries';

/**
 * The admin reports, read from database/queries.sql.
 *
 * That file is the single source: each `-- name:` block there is parsed here
 * and run as written, so the SQL handed in with the coursework is the SQL the
 * page executes. The blocks take no parameters (they are fixed questions,
 * windowed with CURDATE()), so nothing from a request ever reaches them.
 */

export type { NamedQuery } from '@/lib/services/named-queries';

export interface ReportResult extends NamedQuery {
  columns: string[];
  rows: Record<string, unknown>[];
}

const QUERIES_FILE = path.join(process.cwd(), 'database', 'queries.sql');

let cache: Promise<NamedQuery[]> | null = null;

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
