'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency } from '@/lib/services/pricing';

/**
 * Cancel from My bookings.
 *
 * Asks twice, in place (no browser dialog): the first press arms it. The
 * server runs sp_cancel_booking, whose triggers refund the payment and write
 * the history; the page then refreshes to show both.
 */
export function CancelBookingButton({ bookingId, reference }: { bookingId: number; reference: string }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    try {
      const response = await apiFetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      const body = (await response.json().catch(() => null)) as
        | { cancelled?: { refundedAmount: number }; error?: string }
        | null;
      if (!response.ok || !body?.cancelled) {
        toast.show(body?.error ?? 'That booking could not be cancelled.', 'error');
        return;
      }
      toast.show(`${reference} cancelled. ${formatCurrency(body.cancelled.refundedAmount)} refunded.`, 'success');
      startTransition(() => router.refresh());
    } catch {
      toast.show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cancel}
      onBlur={() => setArmed(false)}
      disabled={busy}
      aria-busy={busy || undefined}
      className="keycap t-label text-[var(--accent-text)]"
    >
      {armed ? 'Yes, cancel it' : 'Cancel'}
    </button>
  );
}
