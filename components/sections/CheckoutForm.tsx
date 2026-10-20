'use client';

import { useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Annotation } from '@/components/ui/Annotation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { calculatePrice, formatCurrency } from '@/lib/services/pricing';
import { quoteDelivery } from '@/lib/services/distance';
import { apiFetch } from '@/lib/api-client';
import type { Place } from './AddressPicker';

// Leaflet touches `window` at import, and the map is only needed for
// doorstep delivery: load it on demand, never on the server.
const AddressPicker = dynamic(() => import('./AddressPicker').then((m) => m.AddressPicker), {
  ssr: false,
  loading: () => <p className="font-body text-sm text-[var(--muted)]">Loading the map...</p>,
});

interface Branch {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface CheckoutFormProps {
  carId: number;
  ratePerDay: number;
  /** The car's own branch. */
  branch: Branch;
  /** Every open branch, for collection. */
  branches: Branch[];
}

type Choice = `pickup:${number}` | 'doorstep';

const today = () => new Date().toISOString().slice(0, 10);
const short = (name: string) => name.replace(/^D4Drive\s+/, '');

/**
 * The checkout: dates, how the car reaches you, payment, and the summary,
 * laid out to fit about one screen on a laptop.
 *
 * The quote is recomputed here for immediate feedback with the same pure
 * functions the server mirrors (pricing, Haversine, the fee tiers). It is
 * never trusted: sp_create_booking prices the booking again from the locked
 * car row, so a tampered total changes nothing but this screen.
 */
export function CheckoutForm({ carId, ratePerDay, branch, branches }: CheckoutFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [choice, setChoice] = useState<Choice>(`pickup:${branch.id}`);
  const [place, setPlace] = useState<Place | null>(null);
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [method, setMethod] = useState<'card' | 'upi'>('card');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Each other branch, with what collecting there costs (null: too far). */
  const collection = useMemo(
    () =>
      branches.map((b) => {
        if (b.id === branch.id) return { ...b, distanceKm: 0, fee: 0 as number | null };
        const q = quoteDelivery(branch, b);
        return { ...b, distanceKm: q.distanceKm, fee: q.available ? q.fee : null };
      }),
    [branches, branch],
  );

  const pickupId = choice.startsWith('pickup:') ? Number(choice.slice(7)) : null;
  const pickup = collection.find((b) => b.id === pickupId) ?? null;

  function choosePlace(next: Place) {
    setPlace(next);
    setAddressLine(next.addressLine);
    setPincode(next.pincode ?? '');
  }

  const quote = useMemo(() => {
    if (!startDate || !endDate || endDate <= startDate) return null;

    let deliveryFee = 0;
    let distance: number | null = null;
    let deliveryError: string | null = null;

    if (choice === 'doorstep') {
      if (!place) return { pending: true } as const;
      const d = quoteDelivery(branch, { latitude: place.latitude, longitude: place.longitude });
      if (!d.available) deliveryError = d.reason ?? 'Delivery is not available to that address.';
      deliveryFee = d.fee;
      distance = d.distanceKm;
    } else if (pickup) {
      if (pickup.fee === null) deliveryError = `${short(pickup.name)} is beyond 15 km of this car. Choose a nearer branch.`;
      deliveryFee = pickup.fee ?? 0;
      distance = pickup.id === branch.id ? null : pickup.distanceKm;
    }

    try {
      const price = calculatePrice({
        startDate: new Date(`${startDate}T00:00:00Z`),
        endDate: new Date(`${endDate}T00:00:00Z`),
        ratePerDay,
        deliveryFee,
      });
      return { pending: false, price, distance, deliveryError } as const;
    } catch {
      return null;
    }
  }, [startDate, endDate, choice, place, pickup, ratePerDay, branch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setErrors({});
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    const delivery =
      choice === 'doorstep'
        ? {
            mode: 'doorstep' as const,
            addressLine,
            city: place?.city ?? 'Bengaluru',
            pincode,
            latitude: place?.latitude ?? Number.NaN,
            longitude: place?.longitude ?? Number.NaN,
          }
        : { mode: 'self_pickup' as const, pickupBranchId: pickupId ?? branch.id };

    const payment =
      method === 'card'
        ? {
            method: 'card' as const,
            // Only the last four ever leave this form. The full number is
            // never sent, never stored, and never logged.
            cardLastFour: String(form.get('cardNumber') ?? '').replace(/\D/g, '').slice(-4),
          }
        : { method: 'upi' as const, upiHandle: String(form.get('upiHandle') ?? '') };

    try {
      const response = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, startDate, endDate, delivery, payment }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
        booking?: { reference: string };
      };

      if (!response.ok) {
        if (body.fields) setErrors(body.fields);
        toast.show(body.error ?? 'The booking could not be completed.', 'error');
        setSubmitting(false);
        return;
      }

      toast.show('Booking confirmed.', 'success');
      router.push(`/confirmation/${body.booking?.reference ?? ''}`);
    } catch {
      toast.show('Could not reach the server. Check your connection.', 'error');
      setSubmitting(false);
    }
  }

  const labelClass = 't-label text-[var(--muted)]';
  const heading = 'font-display text-[clamp(1.5rem,2.1vw,2.1rem)] font-light leading-none';
  const selectClass =
    'h-12 w-full appearance-none border-b border-[var(--ink)]/40 px-2 py-2 pr-8 font-display text-[clamp(1.05rem,1.3vw,1.3rem)] font-light text-[var(--ink)] transition-colors duration-300 focus:border-[var(--accent-text)] focus:outline-none';
  const chevron = <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" strokeWidth={1.5} />;

  const handover =
    choice === 'doorstep'
      ? quote && !quote.pending && quote.distance !== null
        ? `Delivery, ${quote.distance.toFixed(1)} km`
        : 'Delivery'
      : pickup && pickup.id !== branch.id
        ? `Collection at ${short(pickup.name)}, ${pickup.distanceKm.toFixed(1)} km`
        : `Collection at ${short(branch.name)}`;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12" noValidate>
      <div className="flex flex-col gap-9 lg:col-span-7">
        <fieldset className="border-t border-[var(--ink)]/25 pt-5">
          <legend className="sr-only">Rental dates</legend>
          <h2 className={heading}>Dates</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Pickup" name="startDate" type="date" min={today()} value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate} required />
            <Field
              label="Return"
              name="endDate"
              type="date"
              min={startDate || today()}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={errors.endDate ?? (startDate && endDate && endDate <= startDate ? 'The return date must be after the pickup date.' : undefined)}
              required
            />
          </div>
        </fieldset>

        <fieldset className="border-t border-[var(--ink)]/25 pt-5">
          <legend className="sr-only">Delivery</legend>
          <h2 className={heading}>How you get it</h2>
          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor="delivery-mode" className={labelClass}>
              Collect or deliver
            </label>
            <div className="relative">
              <select id="delivery-mode" className={selectClass} value={choice} onChange={(e) => setChoice(e.target.value as Choice)}>
                <optgroup label="Collect it">
                  {collection.map((b) => (
                    <option key={b.id} value={`pickup:${b.id}`} disabled={b.fee === null}>
                      {b.id === branch.id
                        ? `${short(b.name)}, where it is kept: free`
                        : b.fee === null
                          ? `${short(b.name)}, ${b.distanceKm.toFixed(1)} km: too far`
                          : `${short(b.name)}, ${b.distanceKm.toFixed(1)} km: ${b.fee === 0 ? 'free' : formatCurrency(b.fee)}`}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bring it to me">
                  <option value="doorstep">Deliver to my address</option>
                </optgroup>
              </select>
              {chevron}
            </div>
          </div>

          {choice === 'doorstep' && (
            <div className="mt-6 flex flex-col gap-5">
              <AddressPicker branch={branch} value={place} onChange={choosePlace} />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_9rem]">
                <Field
                  label="Flat, building and street"
                  name="addressLine"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  helper="Filled in from the map. Add the flat number."
                  error={errors['delivery.addressLine']}
                  required
                />
                <Field
                  label="Pincode"
                  name="pincode"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  error={errors['delivery.pincode']}
                  required
                />
              </div>
            </div>
          )}
        </fieldset>
      </div>

      {/* Payment and the summary, side by side with the form on a laptop
          and sticky, so the total stays in view. */}
      <aside className="lg:col-span-5">
        <div className="flex flex-col gap-8 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <fieldset className="relative border-t border-[var(--ink)]/25 pt-5">
            <legend className="sr-only">Payment</legend>
            <h2 className={heading}>Payment</h2>
            <p className="mt-2 max-w-[24ch] font-body text-sm font-light text-[var(--muted)] xl:max-w-[26ch]">
              Simulated. No card details are stored and no money moves.
            </p>
            {/* In the corner beside the heading, its arrow dropping onto the
                method it is about. */}
            <Annotation
              tilt={-6}
              arrow="swoop"
              arrowClassName="-mt-3 h-auto w-16 -translate-x-[14.5rem] -scale-x-100 rotate-[48deg] text-[var(--accent-text)]"
              className="absolute -right-6 top-3 hidden w-64 flex-col items-end text-right text-[var(--accent-text)] xl:flex"
            >
              {'relax, nobody\ngets charged yet.'}
            </Annotation>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[7.5rem_1fr_1fr]">
              <div className="flex flex-col gap-2">
                <label htmlFor="payment-method" className={labelClass}>
                  Method
                </label>
                <div className="relative">
                  <select id="payment-method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                  </select>
                  {chevron}
                </div>
              </div>
              {method === 'card' ? (
                <>
                  <Field label="Card number" name="cardNumber" inputMode="numeric" autoComplete="off" helper="Only the last four are kept." required />
                  <Field label="Name on card" name="cardName" autoComplete="off" required />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <Field label="UPI ID" name="upiHandle" error={errors['payment.upiHandle']} required />
                </div>
              )}
            </div>
          </fieldset>

          <div className="tone-night p-6 shadow-[var(--shadow-float)] md:px-8 md:py-7">
            <h2 className={heading}>Summary</h2>
            {quote && !quote.pending && quote.price ? (
              <>
                <dl className="mt-5 flex flex-col gap-3">
                  <Row label={`${quote.price.days} ${quote.price.days === 1 ? 'day' : 'days'} at ${formatCurrency(ratePerDay)}`} value={formatCurrency(quote.price.rentalAmount)} />
                  <Row label={handover} value={quote.price.deliveryFee === 0 ? 'Free' : formatCurrency(quote.price.deliveryFee)} />
                </dl>
                <div className="mt-4 border-t border-[var(--color-blush)]/30 pt-4">
                  <Row label="Total" value={formatCurrency(quote.price.totalAmount)} emphasis />
                </div>
                {quote.deliveryError && (
                  <p role="alert" className="mt-5 font-body text-sm text-[var(--color-paper)]">
                    {quote.deliveryError}
                  </p>
                )}
              </>
            ) : (
              <p className="t-body mt-6 text-[var(--color-blush)]">
                {choice === 'doorstep' && quote?.pending ? 'Choose the address on the map to see the delivery fee.' : 'Choose your dates to see the total.'}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              variant="blush"
              loading={submitting}
              disabled={!quote || quote.pending || Boolean(quote.deliveryError)}
              className="mt-6 w-full"
            >
              Confirm booking
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={emphasis ? 't-label text-[var(--color-paper)]' : 'font-body text-sm font-light text-[var(--color-blush)]'}>{label}</dt>
      <dd className={emphasis ? 'font-display text-4xl font-light text-[var(--color-paper)]' : 'font-body text-sm text-[var(--color-paper)]'}>{value}</dd>
    </div>
  );
}
