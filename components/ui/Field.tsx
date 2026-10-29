'use client';

import { AlertCircle } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export type FieldTone = 'light' | 'dark' | 'hot';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  label: string;
  error?: string | undefined;
  helper?: ReactNode;
  /** `dark` for charcoal panels, `hot` for carmine ones. */
  tone?: FieldTone;
  /** `lg` sets the typed value in Fraunces, for the sign-in panel. */
  size?: 'md' | 'lg';
  /** @deprecated Use `tone="dark"`. */
  onDark?: boolean;
}

const TONES: Record<FieldTone, { label: string; text: string; rule: string; invalid: string; focus: string; error: string }> = {
  light: {
    label: 'text-[var(--muted)]',
    text: 'text-[var(--ink)] placeholder:text-[var(--muted)]',
    rule: 'border-[var(--ink)]/40',
    invalid: 'border-[var(--accent-text)]',
    focus: 'focus:border-[var(--accent-text)] focus:bg-[var(--ink)]/[0.03]',
    error: 'text-[var(--accent-text)]',
  },
  dark: {
    label: 'text-[var(--color-blush)]/80',
    text: 'text-[var(--color-paper)] placeholder:text-[var(--color-blush)]/55',
    rule: 'border-[var(--color-blush)]/45',
    invalid: 'border-[var(--color-paper)]',
    focus: 'focus:border-[var(--color-paper)] focus:bg-[var(--color-blush)]/[0.06]',
    error: 'text-[var(--color-paper)]',
  },
  hot: {
    label: 'text-[var(--color-blush)]',
    text: 'text-[var(--color-paper)] placeholder:text-[var(--color-blush)]/70',
    rule: 'border-[var(--color-blush)]/70',
    invalid: 'border-[var(--color-paper)]',
    focus: 'focus:border-[var(--color-paper)] focus:bg-[var(--color-blush)]/[0.1]',
    error: 'text-[var(--color-paper)]',
  },
};

/**
 * Underline-only input with the label above it.
 *
 * Placeholder-as-label is banned outright: it fails screen readers and
 * vanishes the moment the user types. The placeholder here is an example in
 * Fraunces italic, never the field's name.
 *
 * The helper and error slots are always in the markup, so revealing an error
 * never pushes the form down. On carmine and charcoal the error is set in
 * paper with an icon, because red cannot signal an error on a red panel.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, helper, tone: toneProp, size = 'md', onDark = false, className = '', required, ...props },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const tone = TONES[toneProp ?? (onDark ? 'dark' : 'light')];

  const sizing =
    size === 'lg'
      ? 'h-14 font-display text-[clamp(1.3rem,1.8vw,1.9rem)] font-light placeholder:font-extralight'
      : 'h-12 font-body text-sm';

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`t-label ${tone.label}`}>
        {label}
        {required && (
          <span aria-hidden className="ml-1">
            *
          </span>
        )}
      </label>

      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : helper ? helperId : undefined}
        className={[
          'w-full border-b bg-transparent px-0 py-2',
          sizing,
          'placeholder:font-display placeholder:italic',
          'transition-[border-color,background-color] duration-300 ease-out',
          'focus:outline-none',
          tone.text,
          error ? `${tone.invalid} border-b-2` : tone.rule,
          tone.focus,
          className,
        ].join(' ')}
        {...props}
      />

      <div className="min-h-[1.125rem]">
        {error ? (
          <p id={errorId} role="alert" className={`flex items-start gap-1.5 font-body text-xs ${tone.error}`}>
            <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {error}
          </p>
        ) : helper ? (
          <p id={helperId} className={`font-body text-xs ${tone.label}`}>
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
});
