import Link from 'next/link';
import type { ReactNode } from 'react';

type Padding = 'default' | 'flush';
type As = 'article' | 'div' | 'section' | 'li';

interface CardBaseProps {
  children: ReactNode;
  /** Carmine `border-t-4`. One featured card per group, at most. */
  featured?: boolean;
  /**
   * `default` is DESIGN.md's `p-8` to `p-12`. `flush` keeps only the gap
   * under the rule, for image cards whose photograph should run to the
   * card's edges.
   */
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
  default: 'p-8 md:p-12',
  flush: 'pt-6',
};

/**
 * The one card in the system.
 *
 * Defined by a single top rule rather than a box, per DESIGN.md section 6.
 * The ground stays transparent so a card reads as a section of the page, not
 * a tile floating on it. Shadows are the soft tinted pair from section 3,
 * and the hover lift is a shadow change only: no translate, so reduced motion
 * needs no special case and nothing reflows.
 *
 * With `href` the whole card is one link, which is one tab stop and one
 * accessible name instead of a link nested in a clickable container.
 */
export function Card(props: StaticCardProps | LinkCardProps) {
  const { children, featured = false, padding = 'default', className = '' } = props;

  const classes = [
    'block bg-transparent',
    featured ? 'border-t-4 border-[var(--color-carmine)]' : 'border-t border-[var(--ink)]',
    PADDING[padding],
    padding === 'default'
      ? 'shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-shadow duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'
      : '',
    props.href && padding === 'default' ? 'hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]' : '',
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
