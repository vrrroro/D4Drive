import type { ReportResult } from '@/lib/services/reports';
import { formatCurrency } from '@/lib/services/pricing';

/** Columns holding rupees, by the alias the query gives them. */
const MONEY = new Set([
  'revenue', 'refunded', 'spent', 'amount', 'total_amount', 'average', 'fees', 'avg_value',
  'lowest', 'highest',
]);

const LABELS: Record<string, string> = {
  rank_in_branch: 'Rank',
  utilisation_pct: 'Utilisation',
  cancel_pct: 'Cancelled share',
  share_pct: 'Share',
  days_on_hire: 'Days on hire',
  registration_no: 'Registration',
  avg_km: 'Average km',
  max_km: 'Longest km',
  avg_days: 'Average days',
  avg_value: 'Average value',
  total_amount: 'Total',
  start_date: 'Pickup',
  refunded_at: 'Refunded',
  changed_at: 'When',
  from_status: 'From',
  to_status: 'To',
  fuel_type: 'Fuel',
};

function label(column: string): string {
  return LABELS[column] ?? column.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function cell(column: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const withTime = column.endsWith('_at') || column === 'joined';
    return value.toLocaleString('en-IN', withTime
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (MONEY.has(column)) return formatCurrency(Number(value));
  if (column.endsWith('_pct')) return `${Number(value).toFixed(1)}%`;
  return String(value).replace(/_/g, ' ');
}

const NUMERIC = (column: string) =>
  MONEY.has(column) || column.endsWith('_pct') || column.endsWith('_km') ||
  ['bookings', 'payments', 'cars', 'rentals', 'cancelled', 'days', 'days_on_hire', 'avg_days', 'rank_in_branch'].includes(column);

/**
 * One report: what it answers, the table, and the exact SQL that produced it.
 * Real table markup, so it reads correctly to assistive technology.
 */
export function ReportTable({ report }: { report: ReportResult }) {
  const id = `report-${report.name}`;
  return (
    <section aria-labelledby={id} className="border-t border-[var(--ink)]/20 py-10">
      <h3 id={id} className="t-sub">{report.title}</h3>
      <p className="t-body mt-3 max-w-[65ch] text-[var(--muted)]">{report.purpose}</p>

      {report.rows.length === 0 ? (
        <p className="mt-6 font-body text-sm text-[var(--muted)]">No rows. Nothing in the data answers this yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse font-body text-sm">
            <thead>
              <tr>
                {report.columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`t-label border-b border-[var(--ink)]/30 pb-2 pr-6 font-semibold text-[var(--muted)] ${NUMERIC(c) ? 'text-right' : 'text-left'}`}
                  >
                    {label(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--ink)]/10">
                  {report.columns.map((c) => (
                    <td key={c} className={`py-2 pr-6 align-top ${NUMERIC(c) ? 'text-right tabular-nums' : ''}`}>
                      {cell(c, row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-6">
        <summary className="t-label cursor-pointer text-[var(--accent-text)]">The SQL</summary>
        <p className="mt-3 font-body text-xs text-[var(--muted)]">Uses: {report.uses}</p>
        <pre className="mt-3 overflow-x-auto bg-[var(--color-ink)] p-5 font-mono text-xs leading-relaxed text-[var(--color-blush)]">
          <code>{report.sql}</code>
        </pre>
      </details>
    </section>
  );
}
