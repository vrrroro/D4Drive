'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';

interface RotatingWordProps {
  words: readonly string[];
  /** Read in full by assistive technology instead of the typing. */
  label: string;
  className?: string;
  typeMs?: number;
  backMs?: number;
  holdMs?: number;
  shuffle?: boolean;
  caret?: boolean;
  /** Start typing. Undefined starts at once. */
  play?: boolean;
}

/**
 * Types a word, holds it, deletes it, types the next.
 *
 * Only this small span re-renders, a character at a time. The animated text
 * is hidden from assistive technology and a visually hidden sentence carries
 * the whole list, so a screen reader hears the joke once, not a stream of
 * letters. Reduced motion shows the first word and stops there.
 */
export function RotatingWord({
  words,
  label,
  className = '',
  typeMs = 60,
  backMs = 32,
  holdMs = 1400,
  shuffle = false,
  caret = false,
  play,
}: RotatingWordProps) {
  const reduced = usePrefersReducedMotion();
  const order = useMemo(() => {
    const list = [...words];
    if (!shuffle) return list;
    // Deterministic per page load, shuffled after the first word so the
    // server and client agree on what renders first.
    for (let i = list.length - 1; i > 1; i -= 1) {
      const j = 1 + Math.floor(Math.random() * i);
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
  }, [words, shuffle]);

  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(order[0]?.length ?? 0);
  const [deleting, setDeleting] = useState(false);

  const running = !reduced && play !== false && order.length > 1;

  useEffect(() => {
    if (!running) return undefined;
    const word = order[index] ?? '';
    let delay: number;
    let next: () => void;

    if (!deleting && length < word.length) {
      delay = typeMs;
      next = () => setLength(length + 1);
    } else if (!deleting) {
      delay = holdMs;
      next = () => setDeleting(true);
    } else if (length > 0) {
      delay = backMs;
      next = () => setLength(length - 1);
    } else {
      delay = typeMs * 3;
      next = () => {
        setDeleting(false);
        setIndex((index + 1) % order.length);
      };
    }

    const timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [running, order, index, length, deleting, typeMs, backMs, holdMs]);

  const word = order[index] ?? '';
  const shown = running ? word.slice(0, length) : order[0] ?? '';

  return (
    <span className={className}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {shown}
        {caret && running && <span className="typed-caret">|</span>}
        {/* Holds the line height when the word is momentarily empty. */}
        {shown.length === 0 && <span className="invisible">I</span>}
      </span>
    </span>
  );
}
