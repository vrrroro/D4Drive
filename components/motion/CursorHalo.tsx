'use client';

import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Z } from '@/lib/constants';

const QUERY = '(pointer: fine) and (prefers-reduced-motion: no-preference)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * A carmine halo that trails the pointer.
 *
 * A companion, not a replacement: the native cursor stays visible. Mouse
 * only, never on touch, never under reduced motion. Position lives in Motion
 * values, so following the mouse re-renders nothing.
 */
export function CursorHalo() {
  const enabled = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 210, damping: 24, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 210, damping: 24, mass: 0.6 });
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x.set(event.clientX);
      y.set(event.clientY);
      if (!shown.current) {
        shown.current = true;
        sx.jump(event.clientX);
        sy.jump(event.clientY);
        setVisible(true);
      }
    };
    const leave = () => {
      shown.current = false;
      setVisible(false);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [enabled, x, y, sx, sy]);

  if (!enabled) return null;

  return (
    <motion.svg
      aria-hidden="true"
      width={14}
      height={14}
      viewBox="0 0 14 14"
      className="pointer-events-none fixed left-0 top-0 transition-opacity duration-300"
      style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%', zIndex: Z.cursor, opacity: visible ? 1 : 0 }}
    >
      <circle cx="7" cy="7" r="7" fill="rgb(168 37 25 / 0.25)" />
      <circle cx="7" cy="7" r="2" fill="var(--color-carmine)" />
    </motion.svg>
  );
}
