import type { AdvisorCar } from '@/lib/advisor/schema';

/**
 * Tidying what the model writes before a visitor sees it. Pure, unit tested.
 */

/**
 * The site's copy has no em or en dashes (DESIGN.md, hard bans), and the
 * advisor's answers are copy the visitor reads. The prompt asks for none;
 * this makes sure: a dash between numbers is a range ("5 to 10 km"),
 * anywhere else it becomes a comma. Markdown emphasis is dropped too, since
 * the widget shows plain text.
 */
export function cleanReply(text: string): string {
  return text
    // The widget's car cards are the only links; a model's own links (often
    // invented) are reduced to their words and bare URLs dropped.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\(?\bhttps?:\/\/\S+\)?/g, '')
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[\u2013\u2014]\s*/g, ', ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rupee amounts in a reply that no tool returned. A small model will
 * happily invent a price; every ₹ figure the visitor reads must be one of
 * the numbers the database handed back this turn (a daily rate, a rental
 * total) or a delivery fee from lib/constants (`allowed`).
 */
export function ungroundedAmounts(reply: string, allowed: ReadonlySet<number>): number[] {
  const amounts = [...reply.matchAll(/₹\s?(\d[\d,]*(?:\.\d+)?)/g)].map((m) => Number(m[1]!.replace(/,/g, '')));
  return amounts.filter((n) => !allowed.has(n));
}

/** Every number anywhere in a tool's output, for ungroundedAmounts. */
export function numbersIn(value: unknown, into: Set<number> = new Set()): Set<number> {
  if (typeof value === 'number') into.add(value);
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => numbersIn(v, into));
  return into;
}

/** Does a draft talk about specific cars or prices (so it must rest on a search)? */
export function soundsFactual(reply: string): boolean {
  return /₹|\b\d+\s*seats?\b|\bper day\b|\ba day\b/i.test(reply);
}

/**
 * The cars a reply actually recommends: those the tools returned this turn
 * whose model the reply names, in the order it names them, at most three.
 * The widget links each one to its page. A car the model names but no tool
 * returned is never linked, so a link always points at a real, active car.
 */
export function mentionedCars(reply: string, seen: Iterable<AdvisorCar>, limit = 3): AdvisorCar[] {
  const text = reply.toLowerCase();
  const cars = [...seen];
  // A reply may shorten "Swift VXi" to "Swift". The first word stands in for
  // the model only when no other car this turn shares it.
  const firstWord = (car: AdvisorCar) => car.model.toLowerCase().split(/\s+/)[0] ?? '';
  const shared = (word: string) => cars.filter((c) => firstWord(c) === word).length > 1;
  const find = (car: AdvisorCar) => {
    const full = text.indexOf(car.model.toLowerCase());
    if (full >= 0) return full;
    const word = firstWord(car);
    if (word.length < 3 || shared(word)) return -1;
    return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).exec(text)?.index ?? -1;
  };
  return cars
    .map((car) => ({ car, at: find(car) }))
    .filter((hit) => hit.at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map((hit) => hit.car);
}
