import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/guards';
import { listUserBookings } from '@/lib/services/bookings';
import { formatCurrency } from '@/lib/services/pricing';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const DELIVERY_LABEL: Record<string, string> = {
  pending: 'Preparing',
  out_for_delivery: 'On its way',
  delivered: 'Delivered',
  returned: 'Returned',
};

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/bookings');

  let bookings;
  try {
    bookings = await listUserBookings(session.userId);
  } catch (error) {
    console.error('[bookings/page]', error);
    return (
      <main className="px-8 pt-24 md:px-16">
        <div className="mx-auto w-full max-w-[1600px] border-t border-[var(--ink)] pt-12">
          <h1 className="font-display text-4xl text-[var(--ink)]">Your bookings could not be loaded</h1>
          <p className="mt-4 max-w-[52ch] font-body text-[var(--muted)]">
            The database did not respond. This is on our side, not yours.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="h-px w-8 bg-[var(--ink)] md:w-12" />
        <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-7xl">
          Your{' '}
          <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
            journeys
          </span>
        </h1>

        {bookings.length === 0 ? (
          <section className="mt-20 border-t border-[var(--ink)] pt-12">
            <h2 className="font-display text-3xl text-[var(--ink)]">Nothing booked yet</h2>
            <p className="mt-4 max-w-[52ch] font-body text-[var(--muted)]">
              When you reserve a car it appears here, with its delivery status
              and a downloadable invoice.
            </p>
            <Link href="/cars" className="mt-8 inline-block">
              <Button>Browse the fleet</Button>
            </Link>
          </section>
        ) : (
          <section className="mt-20 flex flex-col gap-px bg-[var(--ink)]/15">
            {bookings.map((b) => (
              <article
                key={b.id}
                className="grid grid-cols-1 gap-6 bg-[var(--ground)] p-8 md:grid-cols-12 md:items-center md:p-10"
              >
                <div className="md:col-span-4">
                  <h2 className="font-display text-2xl text-[var(--ink)]">
                    {b.brand} {b.model}
                  </h2>
                  <p className="mt-2 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
                    {b.reference}
                  </p>
                </div>

                <div className="md:col-span-3">
                  <p className="font-body text-sm text-[var(--ink)]">
                    {formatDate(b.start_date)} to {formatDate(b.end_date)}
                  </p>
                  <p className="mt-1 font-body text-xs text-[var(--muted)]">
                    {b.days} {b.days === 1 ? 'day' : 'days'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="font-body text-sm capitalize text-[var(--ink)]">{b.status}</p>
                  <p className="mt-1 font-body text-xs text-[var(--muted)]">
                    {b.delivery_mode === 'doorstep'
                      ? (DELIVERY_LABEL[b.delivery_status] ?? b.delivery_status)
                      : 'Self pickup'}
                  </p>
                </div>

                <div className="md:col-span-1">
                  <p className="font-body text-sm text-[var(--ink)]">
                    {formatCurrency(Number(b.total_amount))}
                  </p>
                </div>

                <div className="md:col-span-2 md:text-right">
                  <a
                    href={`/api/bookings/${b.id}/invoice`}
                    className="font-body text-xs uppercase tracking-[0.2em] text-[var(--color-carmine)] underline underline-offset-8 transition-colors duration-500 hover:text-[var(--ink)]"
                  >
                    Invoice
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
