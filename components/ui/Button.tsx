'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /**
   * Set on charcoal grounds. The default primary is charcoal-filled, which is
   * invisible on a charcoal panel, so on dark the fill inverts to carmine.
   * White on carmine measures 7.13:1; charcoal on charcoal measures 1:1.
   */
  onDark?: boolean;
  children: ReactNode;
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-6',
  md: 'h-12 px-8',
  lg: 'h-14 px-10',
};

/**
 * Primary carries a carmine layer that slides in from the left on hover.
 *
 * The layered span structure is required: the sliding element is absolutely
 * positioned and the label sits above it at z-10. Animating the background
 * colour directly instead would be a paint-bound transition rather than a
 * compositor-bound one, and it loses the directional wipe entirely.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    onDark = false,
    children,
    className = '',
    disabled,
    ...props
  },
  ref,
) {
  const base = [
    'relative isolate inline-flex items-center justify-center overflow-hidden',
    'font-body text-xs font-medium uppercase tracking-[0.2em]',
    // Labels must not wrap at desktop. A wrapped CTA is a broken CTA.
    'whitespace-nowrap',
    'transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-carmine)]',
    'active:translate-y-px',
  ].join(' ');

  if (variant === 'link') {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} h-auto p-0 text-[var(--ink)] hover:text-[var(--color-carmine)] ${className}`}
        {...props}
      >
        <span className="relative">
          {children}
          <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--color-carmine)] transition-all duration-500 group-hover:w-full" />
        </span>
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${SIZES[size]} border bg-transparent ${
          onDark
            ? 'border-[var(--color-paper)]/50 text-[var(--color-paper)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
            : 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--ground)]'
        } ${className}`}
        {...props}
      >
        {loading && <Loader2 aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
        {children}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} group ${SIZES[size]} shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
        onDark
          ? 'bg-[var(--color-carmine)] text-[var(--color-paper)]'
          : 'bg-[var(--btn-bg)] text-[var(--btn-fg)]'
      } ${className}`}
      {...props}
    >
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 -translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-0 motion-reduce:transition-none ${
          onDark ? 'bg-[var(--color-carmine-deep)]' : 'bg-[var(--color-carmine)]'
        }`}
      />
      <span className="relative z-10 inline-flex items-center transition-colors duration-500 group-hover:text-[var(--color-paper)]">
        {loading && <Loader2 aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
        {children}
      </span>
    </button>
  );
});
