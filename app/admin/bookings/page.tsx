import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/guards';
import { listAllBookings } from '@/lib/services/bookings';
import { AdminBookingRow } from '@/components/sections/AdminBookingRow';

export const dynamic = 'force-dynamic';

const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

export default async function AdminBookingsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/bookings');
  if (session.role !== 'admin') redirect('/');

  const bookings = await listAllBookings();

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <Link href="/admin" className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)] transition-colors duration-500 hover:text-[var(--color-carmine)]">
          Operations
        </Link>

        <h1 className="font-display mt-8 text-4xl leading-[0.95] text-[var(--ink)] md:text-6xl">
          Bookings and{' '}
          <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
            deliveries
          </span>
        </h1>

        {bookings.length === 0 ? (
          <section className="mt-16 border-t border-[var(--ink)] pt-12">
            <h2 className="font-display text-2xl text-[var(--ink)]">No bookings yet</h2>
            <p className="mt-4 max-w-[52ch] font-body text-[var(--muted)]">
              Bookings appear here as customers place them, with the status
              changes available at each stage.
            </p>
          </section>
        ) : (
          <section className="mt-16 flex flex-col gap-px bg-[var(--ink)]/15">
            {bookings.map((b) => (
              <AdminBookingRow
                key={b.id}
                booking={{
                  id: b.id,
                  reference: b.reference,
                  brand: b.brand,
                  model: b.model,
                  start_date: iso(b.start_date),
                  end_date: iso(b.end_date),
                  total_amount: b.total_amount,
                  status: b.status,
                  delivery_mode: b.delivery_mode,
                  delivery_status: b.delivery_status,
                }}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
