'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  helper?: ReactNode;
  /** Renders label and helper in the inverted palette, for use over the film. */
  onDark?: boolean;
}

/**
 * Underline-only input with the label above it.
 *
 * Placeholder-as-label is banned outright. It fails screen readers, and it
 * vanishes the moment the user types, leaving them with no way to recall what
 * the field wanted. The placeholder here is Playfair italic and carries an
 * example, never the field name.
 *
 * The helper and error slots are always present in markup, even when empty, so
 * revealing an error does not shift the layout below it.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, helper, onDark = false, className = '', required, ...props },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const labelColour = onDark ? 'text-[var(--color-paper)]/70' : 'text-[var(--muted)]';
  const inputColour = onDark
    ? 'text-[var(--color-paper)] border-[var(--color-paper)]/40 placeholder:text-[var(--color-paper)]/50'
    : 'text-[var(--ink)] border-[var(--ink)]/40 placeholder:text-[var(--muted)]';

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`font-body text-[10px] uppercase tracking-[0.25em] ${labelColour}`}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-[var(--color-carmine)]">
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
          'h-12 w-full border-b bg-transparent px-0 py-2',
          'font-body text-sm',
          'placeholder:font-display placeholder:italic',
          'transition-colors duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          'focus:border-[var(--color-carmine)] focus:outline-none',
          error ? 'border-[var(--color-carmine)]' : inputColour,
          className,
        ].join(' ')}
        {...props}
      />

      {/* Reserved height so revealing an error does not push the form down. */}
      <div className="min-h-[1.125rem]">
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="font-body text-xs text-[var(--color-carmine)]"
          >
            {error}
          </p>
        ) : helper ? (
          <p id={helperId} className={`font-body text-xs ${labelColour}`}>
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
});
