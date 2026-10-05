import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/guards';
import { getDashboardStats } from '@/lib/services/admin';
import { formatCurrency } from '@/lib/services/pricing';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getSession();
  // Re-checked server-side on every admin route. Hiding a link is not access
  // control, and middleware alone would not cover a direct data fetch.
  if (!session) redirect('/login?next=/admin');
  if (session.role !== 'admin') redirect('/');

  const stats = await getDashboardStats();

  const tiles = [
    { label: 'Revenue collected', value: formatCurrency(stats.revenue), lead: true },
    { label: 'Bookings in progress', value: String(stats.bookingsActive) },
    { label: 'Bookings all time', value: String(stats.bookingsTotal) },
    { label: 'Cars available', value: `${stats.fleetActive} of ${stats.fleetTotal}` },
    { label: 'Deliveries to dispatch', value: String(stats.deliveriesPending) },
  ];

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="h-px w-8 bg-[var(--ink)] md:w-12" />
        <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-7xl">
          Operations
        </h1>

        <nav aria-label="Admin sections" className="mt-10 flex flex-wrap gap-8">
          <Link href="/admin/fleet" className="font-body text-xs uppercase tracking-[0.2em] text-[var(--ink)] underline underline-offset-8 transition-colors duration-500 hover:text-[var(--accent-text)]">
            Fleet
          </Link>
          <Link href="/admin/bookings" className="font-body text-xs uppercase tracking-[0.2em] text-[var(--ink)] underline underline-offset-8 transition-colors duration-500 hover:text-[var(--accent-text)]">
            Bookings and deliveries
          </Link>
        </nav>

        {/* Five tiles. The lead tile spans two columns and carries the one
            featured rule, so the grid has rhythm rather than five identical
            boxes. */}
        <section className="mt-20 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Card
              key={tile.label}
              as="div"
              featured={tile.lead}
              className={tile.lead ? 'sm:col-span-2' : ''}
            >
              <p className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
                {tile.label}
              </p>
              <p className={`font-display mt-4 ${tile.lead ? 'text-6xl text-[var(--accent-text)] md:text-7xl' : 'text-4xl text-[var(--ink)] md:text-5xl'}`}>
                {tile.value}
              </p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
