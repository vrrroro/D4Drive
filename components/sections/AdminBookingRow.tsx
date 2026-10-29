'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/services/pricing';

interface AdminBookingRowProps {
  booking: {
    id: number;
    reference: string;
    brand: string;
    model: string;
    start_date: string;
    end_date: string;
    total_amount: string;
    status: string;
    delivery_mode: string;
    delivery_status: string;
  };
}

/**
 * Only legal next states are offered.
 *
 * This mirrors the transition graph the server enforces. The client copy is a
 * convenience so an admin is not shown options that will be rejected; the
 * server remains the authority, because a crafted request bypasses this
 * entirely.
 */
const NEXT_BOOKING: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
};

const NEXT_DELIVERY: Record<string, string[]> = {
  pending: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  returned: [],
};

const LABELS: Record<string, string> = {
  confirmed: 'Confirm',
  active: 'Mark active',
  completed: 'Complete',
  cancelled: 'Cancel',
  out_for_delivery: 'Send out',
  delivered: 'Mark delivered',
  returned: 'Mark returned',
};

export function AdminBookingRow({ booking }: AdminBookingRowProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function patch(kind: 'bookings' | 'deliveries', status: string) {
    if (busy) return;
    setBusy(true);

    try {
      const response = await apiFetch(`/api/admin/${kind}/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.show(body.error ?? 'That change was refused.', 'error');
        setBusy(false);
        return;
      }

      toast.show('Updated.', 'success');
      startTransition(() => router.refresh());
    } catch {
      toast.show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const bookingActions = NEXT_BOOKING[booking.status] ?? [];
  const deliveryActions =
    booking.delivery_mode === 'doorstep' ? (NEXT_DELIVERY[booking.delivery_status] ?? []) : [];

  const disabled = busy || pending;

  return (
    <Card className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
      <div className="md:col-span-3">
        <h2 className="font-display text-xl text-[var(--ink)]">
          {booking.brand} {booking.model}
        </h2>
        <p className="mt-2 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
          {booking.reference}
        </p>
      </div>

      <div className="md:col-span-2">
        <p className="font-body text-xs text-[var(--muted)]">
          {booking.start_date} to {booking.end_date}
        </p>
        <p className="mt-1 font-body text-sm text-[var(--ink)]">
          {formatCurrency(Number(booking.total_amount))}
        </p>
      </div>

      <div className="md:col-span-2">
        <p className="font-body text-sm capitalize text-[var(--ink)]">{booking.status}</p>
        <p className="mt-1 font-body text-xs text-[var(--muted)]">
          {booking.delivery_mode === 'doorstep'
            ? booking.delivery_status.replace(/_/g, ' ')
            : 'Self pickup'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 md:col-span-5 md:justify-end">
        {bookingActions.length === 0 && deliveryActions.length === 0 && (
          <p className="font-body text-xs text-[var(--muted)]">No actions left</p>
        )}

        {bookingActions.map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => patch('bookings', status)}
            className="border border-[var(--ink)] px-4 py-2 font-body text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] transition-colors duration-500 hover:bg-[var(--ink)] hover:text-[var(--ground)] disabled:opacity-40"
          >
            {LABELS[status] ?? status}
          </button>
        ))}

        {deliveryActions.map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => patch('deliveries', status)}
            className="border border-[var(--color-carmine)] px-4 py-2 font-body text-[10px] uppercase tracking-[0.2em] text-[var(--accent-text)] transition-colors duration-500 hover:bg-[var(--color-carmine)] hover:text-[var(--color-paper)] disabled:opacity-40"
          >
            {LABELS[status] ?? status}
          </button>
        ))}
      </div>
    </Card>
  );
}
