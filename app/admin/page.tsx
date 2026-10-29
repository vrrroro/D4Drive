import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StackPanel } from '@/components/motion/StackPanel';
import { Card } from '@/components/ui/Card';
import { EndOfDayClose } from '@/components/sections/EndOfDayClose';
import { getSession } from '@/lib/auth/guards';
import { getDashboardStats } from '@/lib/services/admin';
import { formatCurrency } from '@/lib/services/pricing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Operations' };

export default async function AdminDashboard() {
  const session = await getSession();
  // Re-checked on every admin route. Hiding a link is not access control.
  if (!session) redirect('/login?next=/admin');
  if (session.role !== 'admin') redirect('/');

  const stats = await getDashboardStats();

  const tiles = [
    { label: 'Revenue collected', value: formatCurrency(stats.revenue), lead: true },
    { label: 'Bookings in progress', value: String(stats.bookingsActive) },
    { label: 'Bookings, all time', value: String(stats.bookingsTotal) },
    { label: 'Cars available', value: `${stats.fleetActive} of ${stats.fleetTotal}` },
    { label: 'Deliveries to dispatch', value: String(stats.deliveriesPending) },
  ];

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="ops-title">
      <h1 id="ops-title" className="t-mega">
        Operations.
      </h1>

      <nav aria-label="Admin sections" className="mt-12 flex flex-wrap gap-4">
        <Link href="/admin/fleet" className="keycap t-label">
          Fleet
        </Link>
        <Link href="/admin/bookings" className="keycap t-label">
          Bookings and deliveries
        </Link>
        <Link href="/admin/reports" className="keycap t-label">
          Reports
        </Link>
        <Link href="/admin/database" className="keycap t-label">
          How the database works
        </Link>
      </nav>

      {/* The lead tile spans two columns and carries the one featured rule,
          so the grid has a rhythm rather than five identical boxes. */}
      <section aria-label="Today" className="mt-20 grid grid-cols-1 gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} as="div" featured={tile.lead} className={tile.lead ? 'sm:col-span-2' : ''}>
            <p className="t-label text-[var(--muted)]">{tile.label}</p>
            <p className={`mt-4 font-display font-light ${tile.lead ? 't-mega text-[var(--accent-text)]' : 'text-5xl md:text-6xl'}`}>{tile.value}</p>
          </Card>
        ))}
      </section>

      <section aria-labelledby="close-title" className="mt-20 max-w-[70ch]">
        <h2 id="close-title" className="t-sub">Closing up.</h2>
        <p className="t-body mt-4 text-[var(--muted)]">
          Starts every rental whose pickup day has come, completes every rental due back, marks
          delivered cars returned, and clears sessions that have expired. Safe to run more than once.
        </p>
        <div className="mt-8">
          <EndOfDayClose />
        </div>
      </section>
    </StackPanel>
  );
}
