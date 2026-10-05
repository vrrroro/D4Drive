'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ButtonContent, buttonClassName, type ButtonSize, type ButtonVariant } from './button-styles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /**
   * Set on charcoal grounds. The default primary is charcoal-filled, which is
   * invisible on a charcoal panel, so on dark the fill inverts to carmine.
   * White on carmine measures 7.13:1; charcoal on charcoal measures 1:1.
   */
  onDark?: boolean;
  children: ReactNode;
}

/** An action. For navigation use `ButtonLink`, which looks the same. */
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
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, onDark, className })}
      {...props}
    >
      <ButtonContent variant={variant} onDark={onDark} loading={loading}>
        {children}
      </ButtonContent>
    </button>
  );
});
