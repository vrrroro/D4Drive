import { isCarAvailable } from '@/lib/services/availability';
import { findAdvisorCarsByName, getAdvisorCar, searchFleet, type AdvisorCarRow } from '@/lib/services/advisor-fleet';
import { calculatePrice } from '@/lib/services/pricing';
import { checkAvailabilityInput, searchFleetInput, type AdvisorCar } from '@/lib/advisor/schema';

/**
 * Runs the function calls the model makes, against MySQL.
 *
 * Every call is validated first; a bad one goes back to the model as an
 * error result it can correct, never to a query. Each car a tool returns is
 * recorded in `seen`, so the reply can link only to cars that really exist
 * (reply.ts, mentionedCars).
 */

const shortBranch = (name: string) => name.replace(/^D4Drive\s+/, '');

function toCar(row: AdvisorCarRow): AdvisorCar {
  return {
    id: Number(row.id),
    brand: row.brand,
    model: row.model,
    pricePerDay: Number(row.price_per_day),
    seats: Number(row.seats),
    fuel: row.fuel_type,
    transmission: row.transmission,
    branch: shortBranch(row.branch_name),
    image: row.image_url,
  };
}

/** What the model reads for a car: everything it needs to recommend, nothing it does not. */
function describe(row: AdvisorCarRow) {
  return {
    id: Number(row.id),
    brand: row.brand,
    model: row.model,
    year: Number(row.year),
    seats: Number(row.seats),
    fuel: row.fuel_type,
    gearbox: row.transmission,
    rupees_per_day: Number(row.price_per_day),
    branch: shortBranch(row.branch_name),
    description: row.description,
  };
}

/** What a tool hands back to the model: `output` on success, `error` (which it can correct) when refused. */
export type ToolOutcome = { output: Record<string, unknown> } | { error: string };

async function searchFleetTool(input: unknown, seen: Map<number, AdvisorCar>): Promise<ToolOutcome> {
  const parsed = searchFleetInput.safeParse(input);
  if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.issues[0]?.message ?? 'check the schema'}` };

  const rows = await searchFleet(parsed.data);
  for (const row of rows) seen.set(Number(row.id), toCar(row));
  if (rows.length > 0) return { output: { count: rows.length, cars: rows.map(describe) } };

  // Nothing matches every filter (a small model also adds filters nobody
  // asked for). Hand back the closest cars by seat count, marked as such,
  // so the answer can offer something instead of a dead end.
  const closest = await searchFleet({ ...parsed.data, fuel: null, transmission: null, max_price_per_day: null, brand: null, sort: 'price_asc' });
  for (const row of closest) seen.set(Number(row.id), toCar(row));
  return {
    output: {
      count: 0,
      note: 'No car matches every filter. These are the closest by seats; say they are not an exact match.',
      closest: closest.map(describe),
    },
  };
}

async function checkAvailabilityTool(input: unknown, seen: Map<number, AdvisorCar>, today: string): Promise<ToolOutcome> {
  const parsed = checkAvailabilityInput.safeParse(input);
  if (!parsed.success) return { error: 'Invalid arguments: dates are YYYY-MM-DD, and the car is a car_id from search_fleet or a car_name.' };
  const { car_id, car_name, start_date, end_date } = parsed.data;
  if (end_date <= start_date) return { error: 'The return date must be after the pickup date.' };
  if (start_date < today) return { error: `The pickup date is in the past. Today is ${today}.` };

  // An id is only trusted if a search this turn returned it: the
  // conversation keeps names, not ids, so any other id is a guess (and a
  // guessed id can be a real but different car). Otherwise the name decides.
  let car: AdvisorCarRow | null = null;
  if (car_id !== null && seen.has(car_id)) car = await getAdvisorCar(car_id);
  else if (car_id !== null && car_name === null) {
    return { error: 'That car_id did not come from a search in this conversation. Pass car_name (for example Honda City ZX), or call search_fleet first.' };
  }
  if (!car && car_name !== null) {
    const matches = await findAdvisorCarsByName(car_name);
    if (matches.length > 1) {
      return { error: `Several cars match "${car_name}": ${matches.map((m) => `${m.brand} ${m.model} (car_id ${m.id})`).join(', ')}. Ask again with one car_id.` };
    }
    car = matches[0] ?? null;
  }
  if (!car) return { error: 'No active car matches. Call search_fleet to see the fleet, then use its car_id.' };
  seen.set(Number(car.id), toCar(car));

  // fn_car_available: the same overlap rule sp_create_booking checks under its lock.
  const available = await isCarAvailable(Number(car.id), start_date, end_date);
  const price = calculatePrice({
    startDate: new Date(`${start_date}T00:00:00Z`),
    endDate: new Date(`${end_date}T00:00:00Z`),
    ratePerDay: Number(car.price_per_day),
    deliveryFee: 0,
  });
  return {
    output: {
      car_id: Number(car.id),
      car: `${car.brand} ${car.model}`,
      seats: Number(car.seats),
      fuel: car.fuel_type,
      gearbox: car.transmission,
      available,
      days: price.days,
      rupees_per_day: price.ratePerDay,
      rental_rupees: price.rentalAmount,
      note: 'Excludes any delivery fee. A preview: the booking checks again when it is made.',
    },
  };
}

/**
 * One tool call in (its name and arguments, both from the model), its
 * outcome out. Database errors propagate to the route, which answers with
 * a generic 500.
 */
export async function runTool(name: string, args: unknown, seen: Map<number, AdvisorCar>, today: string): Promise<ToolOutcome> {
  // ADVISOR_DEBUG=1 logs each call (tool names and filters only, never the visitor's words).
  if (process.env.ADVISOR_DEBUG === '1') console.info('[advisor] tool', name, JSON.stringify(args));
  if (name === 'search_fleet') return searchFleetTool(args ?? {}, seen);
  if (name === 'check_availability') return checkAvailabilityTool(args ?? {}, seen, today);
  return { error: `There is no tool called ${name || 'that'}. Use search_fleet or check_availability.` };
}
