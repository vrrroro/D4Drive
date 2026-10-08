'use client';

import Link from 'next/link';
import { RotatingWord } from './RotatingWord';

const WORDS = ['drive', 'road trip', 'skip the cab', 'do the airport run', 'go to Coorg', 'see Nandi Hills', 'get going'] as const;

/**
 * "Let's ___", typed, in the header. One link with one name: it goes to the
 * fleet, whatever word happens to be on screen.
 */
export function LetsCta({ className = '' }: { className?: string }) {
  return (
    // Display comes from the caller (it is hidden on small screens), so the
    // base classes set none: a display utility here would fight theirs.
    <Link href="/cars" aria-label="Browse the fleet" className={`t-label min-w-[13.5rem] items-baseline gap-[0.45em] whitespace-nowrap ${className}`}>
      <span aria-hidden="true">Let&apos;s</span>
      <RotatingWord words={WORDS} label="" caret typeMs={80} backMs={40} holdMs={2600} className="text-[var(--header-accent)]" />
    </Link>
  );
}
