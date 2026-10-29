import Link from 'next/link';
import type { ReactNode } from 'react';

type Padding = 'default' | 'flush';
type As = 'article' | 'div' | 'section' | 'li';

interface CardBaseProps {
  children: ReactNode;
  /** Carmine top rule. One featured card per group, at most. */
  featured?: boolean;
  /** `flush` keeps only the gap under the rule, for rows and image cards. */
  padding?: Padding;
  className?: string;
}

interface StaticCardProps extends CardBaseProps {
  as?: As;
  href?: undefined;
}

interface LinkCardProps extends CardBaseProps {
  href: string;
  as?: undefined;
}

const PADDING: Record<Padding, string> = {
  default: 'py-8 md:py-10',
  flush: 'pt-6',
};

/**
 * The one card in the system: a rule on top, not a box.
 *
 * Transparent, so a card reads as a section of whatever panel it sits on.
 * With `href` the whole card is one link: one tab stop, one name.
 */
export function Card(props: StaticCardProps | LinkCardProps) {
  const { children, featured = false, padding = 'default', className = '' } = props;

  const classes = [
    'block bg-transparent',
    featured ? 'border-t-4 border-[var(--color-carmine)]' : 'border-t border-current/20',
    PADDING[padding],
    props.href ? 'group' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const Tag = props.as ?? 'article';
  return <Tag className={classes}>{children}</Tag>;
}
