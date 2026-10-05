import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button looks, shared by `Button` (a real <button>) and `ButtonLink` (a real
 * <a>). Navigation must be a link and an action must be a button; wrapping
 * one in the other is invalid HTML and puts two tab stops on one control.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-6',
  md: 'h-12 px-8',
  lg: 'h-14 px-10',
};

const EASE = 'ease-[cubic-bezier(0.25,0.46,0.45,0.94)]';

const BASE = [
  'group relative isolate inline-flex items-center justify-center overflow-hidden',
  'font-body text-xs font-medium uppercase tracking-[0.2em]',
  // Labels must not wrap at desktop. A wrapped CTA is a broken CTA.
  'whitespace-nowrap',
  // Named properties, not transition-all, so nothing layout-bound can ever
  // start animating by accident.
  `transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-500 ${EASE}`,
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-text)]',
  'active:translate-y-px motion-reduce:active:translate-y-0',
].join(' ');

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  onDark = false,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onDark?: boolean;
  className?: string;
}): string {
  if (variant === 'link') {
    return `${BASE} h-auto p-0 text-[var(--ink)] hover:text-[var(--accent-text)] ${className}`;
  }

  if (variant === 'secondary') {
    return `${BASE} ${SIZES[size]} border bg-transparent ${
      onDark
        ? 'border-[var(--color-paper)]/50 text-[var(--color-paper)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
        : 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--ground)]'
    } ${className}`;
  }

  return `${BASE} ${SIZES[size]} shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
    onDark
      ? 'bg-[var(--color-carmine)] text-[var(--color-paper)]'
      : 'bg-[var(--btn-bg)] text-[var(--btn-fg)]'
  } ${className}`;
}

/**
 * The label and its layers.
 *
 * Primary carries a carmine layer that slides in from the left on hover. The
 * layered structure is required: the sliding element is absolutely
 * positioned and the label sits above it at z-10. Animating the background
 * colour instead would be paint-bound, and it loses the directional wipe.
 *
 * Link carries an underline that grows from the left with `scaleX`, never an
 * animated width.
 */
export function ButtonContent({
  variant = 'primary',
  onDark = false,
  loading = false,
  children,
}: {
  variant?: ButtonVariant;
  onDark?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  const spinner = loading ? (
    <Loader2 aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
  ) : null;

  if (variant === 'link') {
    return (
      <span className="relative">
        {children}
        <span
          aria-hidden
          className={`absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--color-carmine)] transition-transform duration-500 ${EASE} group-hover:scale-x-100`}
        />
      </span>
    );
  }

  if (variant === 'secondary') {
    return (
      <>
        {spinner}
        {children}
      </>
    );
  }

  return (
    <>
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 -translate-x-full transition-transform duration-500 ${EASE} group-hover:translate-x-0 motion-reduce:transition-none ${
          onDark ? 'bg-[var(--color-carmine-deep)]' : 'bg-[var(--color-carmine)]'
        }`}
      />
      <span className="relative z-10 inline-flex items-center transition-colors duration-500 group-hover:text-[var(--color-paper)]">
        {spinner}
        {children}
      </span>
    </>
  );
}
