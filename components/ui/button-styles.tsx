import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button looks, shared by `Button` (a real <button>) and `ButtonLink` (a real
 * <a>). Navigation must be a link and an action must be a button; wrapping
 * one in the other is invalid HTML and puts two tab stops on one control.
 *
 * Every button goes red on hover with white type (`--btn-hover-bg`, the
 * deeper carmine on a carmine panel):
 * - primary: charcoal with a red layer that wipes in from the left.
 * - blush: the pale fill used on carmine and charcoal panels. Presses in on
 *   hover, like a keycap, and fills red.
 * - secondary: a 1px outline that fills red on hover.
 * - link: text with an underline that grows from the left (a link, not a
 *   button, so it only turns the accent colour).
 */

export type ButtonVariant = 'primary' | 'blush' | 'secondary' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-5',
  md: 'h-12 px-7',
  lg: 'h-14 px-9',
};

const BASE = [
  'group relative isolate inline-flex items-center justify-center overflow-hidden',
  'font-body text-xs font-semibold uppercase tracking-[0.18em]',
  // A wrapped CTA is a broken CTA.
  'whitespace-nowrap',
  'transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 ease-out',
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-text)]',
].join(' ');

const PRESS =
  'shadow-[0_1px_0_0_rgba(26,26,26,0.35)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[-2px_-2px_2px_1px_rgba(0,0,0,0.12)] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0';

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
    return `${BASE} h-auto p-0 text-current hover:text-[var(--accent-text)] ${className}`;
  }

  if (variant === 'blush') {
    return `${BASE} ${SIZES[size]} ${PRESS} bg-[var(--color-blush)] text-[var(--color-ink)] hover:bg-[var(--btn-hover-bg)] hover:text-[var(--color-paper)] ${className}`;
  }

  if (variant === 'secondary') {
    return `${BASE} ${SIZES[size]} border bg-transparent ${
      onDark
        ? 'border-[var(--color-blush)]/60 text-[var(--color-blush)] hover:border-[var(--btn-hover-bg)] hover:bg-[var(--btn-hover-bg)] hover:text-[var(--color-paper)]'
        : 'border-[var(--ink)] text-[var(--ink)] hover:border-[var(--btn-hover-bg)] hover:bg-[var(--btn-hover-bg)] hover:text-[var(--color-paper)]'
    } ${className}`;
  }

  return `${BASE} ${SIZES[size]} shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] active:translate-y-px motion-reduce:active:translate-y-0 ${
    onDark ? 'bg-[var(--color-carmine)] text-[var(--color-paper)]' : 'bg-[var(--btn-bg)] text-[var(--btn-fg)]'
  } ${className}`;
}

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
  const spinner = loading ? <Loader2 aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : null;

  if (variant === 'link') {
    return (
      <span className="relative">
        {children}
        <span
          aria-hidden
          className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-out group-hover:scale-x-100"
        />
      </span>
    );
  }

  if (variant === 'secondary' || variant === 'blush') {
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
        className={`absolute inset-0 -z-10 -translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0 motion-reduce:transition-none ${
          onDark ? 'bg-[var(--color-carmine-deep)]' : 'bg-[var(--btn-hover-bg)]'
        }`}
      />
      <span className="relative z-10 inline-flex items-center transition-colors duration-500 group-hover:text-[var(--color-paper)]">
        {spinner}
        {children}
      </span>
    </>
  );
}
