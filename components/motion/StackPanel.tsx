'use client';

import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { usePrefersReducedMotion } from '@/components/film/FilmContext';

export type PanelTone = 'ground' | 'studio' | 'hot' | 'night';

const HEADER_TONE: Record<PanelTone, 'light' | 'hot' | 'dark'> = {
  ground: 'light',
  studio: 'light',
  hot: 'hot',
  night: 'dark',
};

interface StackPanelProps {
  tone: PanelTone;
  /** Lean while it is dealt in: -1 counter-clockwise, 1 clockwise, 0 none. */
  tilt?: -1 | 0 | 1;
  /** Stay pinned while the next panel slides up over it. */
  pin?: boolean;
  as?: 'section' | 'footer' | 'div';
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: ReactNode;
}

/**
 * A full-bleed panel in the stack.
 *
 * Dealt in like a card: it rises slightly small and tilted, and straightens
 * to full size as its top reaches the top of the screen (scale 0.9 to 1,
 * +/-0.7 degrees to 0, scrubbed by the scroll). Transform only, so nothing
 * reflows. Square corners at rest, always.
 *
 * Pinned panels stick once their bottom edge meets the bottom of the screen
 * (top: min(0, viewport - height)), so every line of a tall panel is seen
 * before the next one slides over it.
 */
export function StackPanel({ tone, tilt = 0, pin = true, as = 'section', id, className = '', children, ...aria }: StackPanelProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 25px'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.5, restDelta: 0.0005 });
  const scale = useTransform(p, [0, 1], [0.9, 1]);
  const rotate = useTransform(p, [0, 1], [tilt * 0.7, 0]);

  useEffect(() => {
    const el = ref.current;
    if (!pin || !el) return undefined;
    const update = () => {
      el.style.top = `${Math.min(0, window.innerHeight - el.offsetHeight)}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [pin]);

  const props = {
    id,
    'data-tone': HEADER_TONE[tone],
    className: `tone-${tone} relative ${pin ? 'sticky' : ''} ${className}`,
    style: reduced || tilt === 0 ? undefined : { scale, rotate, transformOrigin: '50% 0%' },
    ...aria,
  };

  if (as === 'footer') return <motion.footer ref={ref} {...props}>{children}</motion.footer>;
  if (as === 'div') return <motion.div ref={ref as RefObject<HTMLDivElement>} {...props}>{children}</motion.div>;
  return <motion.section ref={ref} {...props}>{children}</motion.section>;
}
