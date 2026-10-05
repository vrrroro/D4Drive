'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged client-side for diagnostics. The message itself is never rendered:
    // an unhandled error can carry internal detail the user should not see.
    console.error('[app/error]', error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center px-8 md:px-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-6 md:col-start-2">
            <div className="h-px w-8 bg-[var(--color-carmine)] md:w-12" />
            <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-7xl">
              Something{' '}
              <span className="italic-safe inline-block font-display italic text-[var(--accent-text)]">
                stalled
              </span>
            </h1>
            <p className="mt-8 max-w-[48ch] font-body text-[var(--muted)]">
              This is on our side, not yours. Trying again usually works.
            </p>
            <Button size="lg" onClick={reset} className="mt-12">
              Try again
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
