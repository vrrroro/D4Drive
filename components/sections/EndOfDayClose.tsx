'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import type { EndOfDayResult } from '@/lib/services/operations';

/**
 * The end-of-day close: one button that runs sp_end_of_day_close, whose
 * cursor moves every due booking on, then lists exactly what it changed.
 */
export function EndOfDayClose() {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EndOfDayResult | null>(null);

  async function run() {
    setBusy(true);
    try {
      const response = await apiFetch('/api/admin/operations/close', { method: 'POST' });
      const body = (await response.json().catch(() => null)) as { result?: EndOfDayResult; error?: string } | null;
      if (!response.ok || !body?.result) {
        toast.show(body?.error ?? 'The close did not run.', 'error');
        return;
      }
      setResult(body.result);
      startTransition(() => router.refresh());
    } catch {
      toast.show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={run} loading={busy}>
        Run the end-of-day close
      </Button>

      <div aria-live="polite">
        {result && (
          <div className="mt-8 max-w-[60ch]">
            <p className="t-body">
              {result.steps.length === 0
                ? 'Nothing was due. Every booking is already where it should be.'
                : `${result.activated} rental${result.activated === 1 ? '' : 's'} started, ${result.completed} completed, ${result.deliveriesReturned} car${result.deliveriesReturned === 1 ? '' : 's'} marked returned.`}{' '}
              {result.sessionsPurged > 0 && `${result.sessionsPurged} expired session${result.sessionsPurged === 1 ? '' : 's'} cleared.`}
            </p>
            {result.steps.length > 0 && (
              <ol className="mt-4 flex flex-col gap-1 font-body text-sm text-[var(--muted)]">
                {result.steps.map((s) => (
                  <li key={s.step}>
                    <span className="t-label text-[var(--ink)]">{s.reference}</span>{' '}
                    {s.fromStatus} to {s.toStatus}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
