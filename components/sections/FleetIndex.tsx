import { CarPhoto } from '@/components/ui/CarPhoto';
import { CarLink } from '@/components/motion/CarLink';

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
 * The fleet as a grid, three across on a laptop.
 *
 * No cards: each car is its photograph standing on the page grey (the photos'
 * backdrop is relit to exactly that grey), with the name, specs and price
 * beneath.
 * Hovering lifts the car a little, pools a soft red shadow under it, and
 * turns its words red (globals.css, `.fleet-glow`, `.fleet-text`: opacity
 * and colour only). One link per car, so each
 * is one tab stop with one name; the photo inside is decorative. The link
 * carries the photo into the car page where the browser can (CarLink).
 */
export function FleetIndex({ cars }: { cars: FleetCar[] }) {
  return (
    <ol className="fleet-grid" aria-label="The fleet">
      {cars.map((car, index) => {
        const name = `${car.brand} ${car.model}`;
        return (
          <li key={car.id}>
            <CarLink href={`/cars/${car.id}`} carId={car.id} className="fleet-link group">
              <span className="fleet-photo" data-car-photo={car.id}>
                <CarPhoto src={car.image} name={name} aspect="aspect-[3/2]" decorative priority={index < 3} />
                {car.image && <span aria-hidden="true" className="fleet-glow" />}
              </span>
              <span className="fleet-text t-eyebrow mt-4 text-[var(--muted)]">{car.brand}</span>
              <span className="fleet-text fleet-name t-sub">{car.model}</span>
              <span className="fleet-text mt-3 font-body text-sm font-light leading-relaxed text-[var(--muted)]">
                {car.seats} seats, <span className="capitalize">{car.fuel}</span>, {car.transmission}. Kept at {car.branch}.
              </span>
              <span className="fleet-text mt-3 font-body text-base text-[var(--ink)]">
                {price(car.pricePerDay)}
                <span className="fleet-text text-[var(--muted)]"> a day</span>
              </span>
            </CarLink>
          </li>
        );
      })}
    </ol>
  );
}
