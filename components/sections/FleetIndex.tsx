'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Annotation } from '@/components/ui/Annotation';
import { CarPhoto } from '@/components/ui/CarPhoto';
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

/**
 * The fleet as a ghost stack.
 *
 * Every model name, set enormous at a fifth of a line apart, so they pile up
 * as translucent type. Hover or focus one and it snaps to a bold headline on
 * top of the pile, its studio photograph swings in tilted in 3D, and its
 * brief drops down like a sign on a hinge. Moving down the stack scrubs
 * through the fleet the way the scroll scrubs the film.
 *
 * One list of links serves every layout: on touch screens and narrow windows
 * the same rows lay out as ordinary photo cards (globals.css, .fleet-*). The
 * shared preview is decoration and hidden from assistive technology; each
 * row's own text carries its price and specs.
 */
export function FleetIndex({ cars }: { cars: FleetCar[] }) {
  const [active, setActive] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const current = cars.find((car) => car.id === active) ?? null;
  const price = (value: string) => `₹${Number(value).toLocaleString('en-IN')}`;

  return (
    <div className="fleet relative" onMouseLeave={() => setActive(null)}>
      <ol className="fleet-stack">
        {cars.map((car, index) => {
          const name = `${car.brand} ${car.model}`;
          return (
            <li key={car.id} className="fleet-row" data-active={active === car.id ? 'true' : undefined} style={{ zIndex: active === car.id ? cars.length + 1 : index + 1 }}>
              <Link
                href={`/cars/${car.id}`}
                className="fleet-row-link group"
                onMouseEnter={() => setActive(car.id)}
                onFocus={() => setActive(car.id)}
                onBlur={() => setActive(null)}
              >
                <span className="fleet-card-photo">
                  <CarPhoto src={car.image} name={name} aspect="aspect-[3/2]" decorative priority={index < 2} />
                </span>
                <span className="fleet-name">
                  <span className="fleet-brand">{car.brand} </span>
                  {car.model}
                </span>
                <span className="fleet-specs">
                  {price(car.pricePerDay)} a day, {car.seats} seats, {car.fuel}, {car.transmission}, from {car.branch}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Desktop preview: the hovered car, tilted, with its brief. */}
      <div aria-hidden="true" className="fleet-preview">
        <div className="fleet-photo-frame">
          {cars.map((car) => (
            <motion.div
              key={car.id}
              className="fleet-photo"
              initial={false}
              animate={active === car.id ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduced ? 1 : 0.6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {car.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={car.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              )}
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {current && (
            <motion.div
              key={current.id}
              className="fleet-brief"
              initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: -90 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, rotateX: 90 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: '50% 0%' }}
            >
              <p className="t-label text-[var(--color-blush)]">Per day</p>
              <p className="t-sub mt-1 text-[var(--color-paper)]">{price(current.pricePerDay)}</p>
              <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 font-body text-sm text-[var(--color-paper)]">
                <dt className="t-label text-[var(--color-blush)]">Seats</dt>
                <dd>{current.seats}</dd>
                <dt className="t-label text-[var(--color-blush)]">Fuel</dt>
                <dd className="capitalize">{current.fuel}</dd>
                <dt className="t-label text-[var(--color-blush)]">Gearbox</dt>
                <dd className="capitalize">{current.transmission}</dd>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {current ? (
            <motion.div key={`note-${current.id}`} className="fleet-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Annotation tilt={-14} arrow="swoop" arrowClassName="mt-1 ml-10 h-auto w-28 rotate-[-38deg] text-[var(--color-blush)]" className="text-[var(--color-blush)]">
                {`lives in\n${current.branch}`}
              </Annotation>
            </motion.div>
          ) : (
            // At rest the pile is just type. Say what it is.
            <motion.div key="note-rest" className="fleet-rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Annotation tilt={-9} arrow="long" arrowClassName="mt-2 h-auto w-40 -scale-x-100 rotate-[14deg] text-[var(--color-blush)]" className="text-[var(--color-blush)]">
                {`${cars.length === 1 ? 'one car' : `${cars.length} cars`} in there.\npoint at one.`}
              </Annotation>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
