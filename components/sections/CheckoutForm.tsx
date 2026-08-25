'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { calculatePrice, formatCurrency } from '@/lib/services/pricing';
import { quoteDelivery } from '@/lib/services/distance';
import { readCsrfToken } from '@/lib/csrf';

interface CheckoutFormProps {
  carId: number;
  ratePerDay: number;
  branch: { name: string; latitude: number; longitude: number };
}

const today = () => new Date().toISOString().slice(0, 10);

export function CheckoutForm({ carId, ratePerDay, branch }: CheckoutFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'self_pickup' | 'doorstep'>('self_pickup');
  const [method, setMethod] = useState<'card' | 'upi'>('card');
  const [coords, setCoords] = useState<{ lat: string; lon: string }>({ lat: '', lon: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * The quote is recomputed on the client for immediate feedback, using the
   * same pure functions the server uses. It is never trusted: the server
   * recalculates from the locked car row, so a tampered client total changes
   * nothing except what this screen displays.
   */
  const quote = useMemo(() => {
    if (!startDate || !endDate || endDate <= startDate) return null;

    let deliveryFee = 0;
    let distance: number | null = null;
    let deliveryError: string | null = null;

    if (mode === 'doorstep') {
      const lat = Number(coords.lat);
      const lon = Number(coords.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || (!lat && !lon)) {
        return { pending: true } as const;
      }
      const d = quoteDelivery(branch, { latitude: lat, longitude: lon });
      if (!d.available) {
        deliveryError = d.reason ?? 'Delivery is not available to that address.';
      }
      deliveryFee = d.fee;
      distance = d.distanceKm;
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
  }, [startDate, endDate, mode, coords, ratePerDay, branch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setErrors({});
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    const delivery =
      mode === 'doorstep'
        ? {
            mode: 'doorstep' as const,
            addressLine: String(form.get('addressLine') ?? ''),
            city: String(form.get('city') ?? ''),
            pincode: String(form.get('pincode') ?? ''),
            latitude: Number(coords.lat),
            longitude: Number(coords.lon),
          }
        : { mode: 'self_pickup' as const };

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
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': readCsrfToken() },
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

  const labelClass = 'font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]';
  const selectClass =
    'h-12 w-full border-b border-[var(--ink)]/40 bg-transparent px-0 py-2 font-body text-sm text-[var(--ink)] transition-colors duration-500 focus:border-[var(--color-carmine)] focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-16 lg:grid-cols-12" noValidate>
      <div className="flex flex-col gap-12 lg:col-span-7">
        <fieldset className="border-t border-[var(--ink)] pt-8">
          <legend className="sr-only">Rental dates</legend>
          <h2 className="font-display text-2xl text-[var(--ink)]">Dates</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Field
              label="Pickup"
              name="startDate"
              type="date"
              min={today()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={errors.startDate}
              required
            />
            <Field
              label="Return"
              name="endDate"
              type="date"
              min={startDate || today()}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={errors.endDate}
              required
            />
          </div>
        </fieldset>

        <fieldset className="border-t border-[var(--ink)] pt-8">
          <legend className="sr-only">Delivery</legend>
          <h2 className="font-display text-2xl text-[var(--ink)]">Delivery</h2>

          <div className="mt-8 flex flex-col gap-2">
            <label htmlFor="delivery-mode" className={labelClass}>
              How would you like the car
            </label>
            <select
              id="delivery-mode"
              className={selectClass}
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="self_pickup">Collect from {branch.name}, free</option>
              <option value="doorstep">Deliver to my address</option>
            </select>
          </div>

          {mode === 'doorstep' && (
            <div className="mt-8 flex flex-col gap-8">
              <Field
                label="Address"
                name="addressLine"
                placeholder="Flat 4B, Brigade Residency, 12th Main"
                error={errors['delivery.addressLine']}
                required
              />
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <Field
                  label="City"
                  name="city"
                  defaultValue="Bengaluru"
                  error={errors['delivery.city']}
                  required
                />
                <Field
                  label="Pincode"
                  name="pincode"
                  inputMode="numeric"
                  placeholder="560038"
                  error={errors['delivery.pincode']}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <Field
                  label="Latitude"
                  name="latitude"
                  inputMode="decimal"
                  placeholder="12.9716"
                  value={coords.lat}
                  onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
                  helper="Delivery reaches 15 km from the branch."
                  required
                />
                <Field
                  label="Longitude"
                  name="longitude"
                  inputMode="decimal"
                  placeholder="77.6412"
                  value={coords.lon}
                  onChange={(e) => setCoords((c) => ({ ...c, lon: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="border-t border-[var(--ink)] pt-8">
          <legend className="sr-only">Payment</legend>
          <h2 className="font-display text-2xl text-[var(--ink)]">Payment</h2>
          <p className="mt-3 font-body text-xs text-[var(--muted)]">
            This payment is simulated. No card details are stored and no real
            transaction takes place.
          </p>

          <div className="mt-8 flex flex-col gap-2">
            <label htmlFor="payment-method" className={labelClass}>
              Method
            </label>
            <select
              id="payment-method"
              className={selectClass}
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          {method === 'card' ? (
            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <Field
                label="Card number"
                name="cardNumber"
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                autoComplete="off"
                helper="Only the last four digits are kept."
                required
              />
              <Field
                label="Name on card"
                name="cardName"
                placeholder="Ananya Krishnan"
                autoComplete="off"
                required
              />
            </div>
          ) : (
            <div className="mt-8">
              <Field
                label="UPI ID"
                name="upiHandle"
                placeholder="ananya@okaxis"
                error={errors['payment.upiHandle']}
                required
              />
            </div>
          )}
        </fieldset>
      </div>

      {/* Summary. Sticky on desktop so the total stays visible while the form
          scrolls, which is the whole reason a checkout summary exists. */}
      <aside className="lg:col-span-4 lg:col-start-9">
        <div className="lg:sticky lg:top-24">
          <div className="border-t-4 border-t-[var(--color-carmine)] bg-[var(--surface)] p-8">
            <h2 className="font-display text-2xl text-[var(--ink)]">Summary</h2>

            {quote && !quote.pending && quote.price ? (
              <>
                <dl className="mt-8 flex flex-col gap-4">
                  <Row
                    label={`${quote.price.days} ${quote.price.days === 1 ? 'day' : 'days'} at ${formatCurrency(ratePerDay)}`}
                    value={formatCurrency(quote.price.rentalAmount)}
                  />
                  <Row
                    label={
                      mode === 'doorstep' && quote.distance !== null
                        ? `Delivery, ${quote.distance.toFixed(1)} km`
                        : 'Delivery'
                    }
                    value={
                      quote.price.deliveryFee === 0
                        ? 'Free'
                        : formatCurrency(quote.price.deliveryFee)
                    }
                  />
                </dl>

                <div className="mt-6 border-t border-[var(--ink)] pt-6">
                  <Row
                    label="Total"
                    value={formatCurrency(quote.price.totalAmount)}
                    emphasis
                  />
                </div>

                {quote.deliveryError && (
                  <p role="alert" className="mt-6 font-body text-xs text-[var(--color-carmine)]">
                    {quote.deliveryError}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-8 font-body text-sm text-[var(--muted)]">
                {mode === 'doorstep' && quote?.pending
                  ? 'Add your coordinates to see the delivery fee.'
                  : 'Choose your dates to see the total.'}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              disabled={!quote || quote.pending || Boolean(quote.deliveryError)}
              className="mt-10 w-full"
            >
              Confirm booking
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={
          emphasis
            ? 'font-body text-sm text-[var(--ink)]'
            : 'font-body text-sm text-[var(--muted)]'
        }
      >
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? 'font-display text-2xl text-[var(--color-carmine)]'
            : 'font-body text-sm text-[var(--ink)]'
        }
      >
        {value}
      </dd>
    </div>
  );
}
