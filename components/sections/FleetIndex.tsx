'use client';

import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useRef } from 'react';
import { CarPhoto } from '@/components/ui/CarPhoto';
import { CarLink } from '@/components/motion/CarLink';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';

export interface FleetCar {
  id: number;
  brand: string;
  model: string;
  pricePerDay: string;
  seats: number;
  fuel: string;
  transmission: string;
  branch: string;
  image: string | null;
}

const price = (value: string) => `₹${Number(value).toLocaleString('en-IN')}`;

/**
 * The fleet as a stack of cards.
 *
 * Each car is a card pinned under the header; as the visitor scrolls, the
 * next one slides up over it, popping up from slightly small to full size as
 * it arrives (scale and lift, scroll-linked, transform only). The pile leaves
 * a sliver of each card above the next, so the stack reads as a deck.
 *
 * Hovering a card greys its photograph (a pre-greyed copy fades in: opacity,
 * not an animated filter) and its name. One link per card, so each is one
 * tab stop with one name; the photo inside is decorative.
 */
export function FleetIndex({ cars }: { cars: FleetCar[] }) {
  return (
    <ol className="fleet-cards" aria-label="The fleet">
      {cars.map((car, index) => (
        <FleetCard key={car.id} car={car} index={index} />
      ))}
    </ol>
  );
}

function FleetCard({ car, index }: { car: FleetCar; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 35%'] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.5, restDelta: 0.0005 });
  const scale = useTransform(p, [0, 1], [0.9, 1]);
  const y = useTransform(p, [0, 1], [70, 0]);
  const name = `${car.brand} ${car.model}`;

  return (
    <li ref={ref} className="fleet-card-slot" style={{ ['--i' as string]: index }}>
      <motion.article className="fleet-card" style={reduced ? undefined : { scale, y, transformOrigin: '50% 100%' }}>
        <CarLink href={`/cars/${car.id}`} carId={car.id} className="fleet-card-link group">
          <span className="fleet-card-photo" data-car-photo={car.id}>
            <CarPhoto src={car.image} name={name} aspect="aspect-[3/2]" decorative priority={index < 2} />
            {car.image && (
              // The grey copy that fades in on hover. Static filter; only its
              // opacity moves.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={car.image} alt="" aria-hidden="true" loading="lazy" decoding="async" className="fleet-card-grey" />
            )}
          </span>
          <span className="fleet-card-text">
            <span className="t-eyebrow text-[var(--muted)]">{car.brand}</span>
            <span className="fleet-card-name t-display">{car.model}</span>
            <span className="t-sub mt-6">
              {price(car.pricePerDay)}
              <span className="t-body text-[var(--muted)]"> a day</span>
            </span>
            <span className="mt-6 font-body text-sm font-light leading-relaxed text-[var(--muted)]">
              {car.seats} seats, <span className="capitalize">{car.fuel}</span>, {car.transmission}. Kept at {car.branch}.
            </span>
            <span className="fleet-card-cta t-label mt-auto">View this car</span>
          </span>
        </CarLink>
      </motion.article>
    </li>
  );
}
