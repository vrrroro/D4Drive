import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { ReportTable } from '@/components/sections/ReportTable';
import { getSession } from '@/lib/auth/guards';
import { runReports, type ReportResult } from '@/lib/services/reports';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Reports' };

/** Every report in database/queries.sql, grouped by who asks the question. */
const GROUPS = [
  { title: 'Money', names: ['revenue_by_branch', 'monthly_revenue', 'car_rank_in_branch', 'refunds'] },
  { title: 'The fleet', names: ['fleet_utilisation', 'cars_never_booked', 'cancellation_rate', 'by_fuel_type', 'price_bands', 'collection_points'] },
  { title: 'Customers', names: ['top_customers', 'repeat_customers', 'customers_never_booked', 'bookings_above_average'] },
  { title: 'Operations', names: ['status_breakdown', 'delivery_modes', 'handovers_next_7_days', 'recent_history'] },
] as const;

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/reports');
  if (session.role !== 'admin') redirect('/');

  let groups: { title: string; reports: ReportResult[] }[] | null = null;
  try {
    groups = await Promise.all(
      GROUPS.map(async (g) => ({ title: g.title, reports: await runReports(g.names) })),
    );
  } catch (error) {
    console.error('[admin/reports]', error);
  }

  const count = groups?.reduce((n, g) => n + g.reports.length, 0) ?? 0;

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="reports-title">
      <Link href="/admin" className="keycap t-label">
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        Operations
      </Link>

      <h1 id="reports-title" className="t-mega mt-12">
        Reports.
      </h1>
      <p className="t-body mt-8 max-w-[65ch] text-[var(--muted)]">
        {count > 0
          ? `${count} questions the business asks of its data, answered live. Each one is a named query in database/queries.sql, run exactly as written there; open "The SQL" under any table to read it.`
          : 'The questions the business asks of its data, answered live from database/queries.sql.'}
      </p>

      {groups === null ? (
        <div className="mt-16 max-w-[52ch]">
          <h2 className="t-sub">The reports could not be run.</h2>
          <p className="t-body mt-4 text-[var(--muted)]">The database did not respond. Reload in a moment.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-label={g.title} className="mt-20">
            <h2 className="t-display">{g.title}</h2>
            <div className="mt-6">
              {g.reports.map((r) => (
                <ReportTable key={r.name} report={r} />
              ))}
            </div>
          </section>
        ))
      )}
    </StackPanel>
  );
}
