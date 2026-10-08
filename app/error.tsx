'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged for diagnostics. The message itself is never rendered: an
    // unhandled error can carry internal detail the visitor should not see.
    console.error('[app/error]', error);
  }, [error]);

  return (
    <section className="panel tone-studio flex min-h-[100dvh] flex-col justify-center pt-[calc(var(--header-h)+3rem)]" data-tone="light" aria-labelledby="err-title">
      <h1 id="err-title" className="t-mega">
        Something <span className="italic-safe inline-block italic">stalled</span>.
      </h1>
      <p className="t-body mt-10 max-w-[44ch] text-[var(--muted)]">This is on our side, not yours. Trying again usually works.</p>
      <Button size="lg" onClick={reset} className="mt-12 w-fit">
        Try again
      </Button>
    </section>
  );
}
