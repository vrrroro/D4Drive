/**
 * The parser for database/queries.sql's named blocks.
 *
 * Pure (no database, no file system), so the tests can check the file
 * without a MySQL to connect to. lib/services/reports.ts reads the file and
 * runs what this returns.
 */

export interface NamedQuery {
  name: string;
  title: string;
  purpose: string;
  uses: string;
  sql: string;
}

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
