import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { ButtonContent, buttonClassName, type ButtonSize, type ButtonVariant } from './button-styles';

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className' | 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onDark?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Navigation that looks like a button. One element, one tab stop, and the
 * right semantics: a screen reader announces a link, because it is one.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  onDark = false,
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, onDark, className })} {...props}>
      <ButtonContent variant={variant} onDark={onDark}>
        {children}
      </ButtonContent>
    </Link>
  );
}
