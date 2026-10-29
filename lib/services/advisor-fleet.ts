import type { RowDataPacket } from 'mysql2/promise';
import { query, queryOne } from '@/lib/db';
import type { SearchFleetInput } from '@/lib/advisor/schema';

/**
 * The fleet as the car advisor sees it (lib/advisor/tools.ts).
 *
 * Read only, and the model never writes SQL: it calls a tool with arguments,
 * zod has already checked them, and they are bound into the fixed queries
 * below exactly as the catalog binds its filters (lib/services/cars.ts).
 */

export interface AdvisorCarRow extends RowDataPacket {
  id: number;
  brand: string;
  model: string;
  year: number;
  seats: number;
  fuel_type: string;
  transmission: string;
  price_per_day: string;
  image_url: string | null;
  description: string | null;
  branch_name: string;
}

/** Allowlisted sort keys to literal ORDER BY clauses: a column name cannot be bound. */
const SORT_CLAUSES = {
  price_asc: 'c.price_per_day ASC, c.id ASC',
  price_desc: 'c.price_per_day DESC, c.id ASC',
  seats_desc: 'c.seats DESC, c.price_per_day ASC',
} as const;

/** The whole active fleet is ten cars; this only stops a future one from flooding the context. */
const RESULT_LIMIT = 12;

export async function searchFleet(filters: SearchFleetInput): Promise<AdvisorCarRow[]> {
  const clauses: string[] = ['c.is_active = 1'];
  const params: unknown[] = [];

  if (filters.seats_min !== null) {
    clauses.push('c.seats >= ?');
    params.push(filters.seats_min);
  }
  if (filters.fuel !== null) {
    clauses.push('c.fuel_type = ?');
    params.push(filters.fuel);
  }
  if (filters.transmission !== null) {
    clauses.push('c.transmission = ?');
    params.push(filters.transmission);
  }
  if (filters.max_price_per_day !== null) {
    clauses.push('c.price_per_day <= ?');
    params.push(filters.max_price_per_day);
  }
  if (filters.brand !== null) {
    clauses.push('c.brand = ?');
    params.push(filters.brand);
  }

  return query<AdvisorCarRow>(
    `SELECT c.id, c.brand, c.model, c.year, c.seats, c.fuel_type, c.transmission,
            c.price_per_day, c.image_url, c.description, b.name AS branch_name
       FROM cars c
       JOIN branches b ON b.id = c.branch_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY ${SORT_CLAUSES[filters.sort]}
      LIMIT ?`,
    [...params, RESULT_LIMIT],
  );
}

/** One active car, for pricing an availability check. */
export async function getAdvisorCar(id: number): Promise<AdvisorCarRow | null> {
  return queryOne<AdvisorCarRow>(
    `SELECT c.id, c.brand, c.model, c.year, c.seats, c.fuel_type, c.transmission,
            c.price_per_day, c.image_url, c.description, b.name AS branch_name
       FROM cars c
       JOIN branches b ON b.id = c.branch_id
      WHERE c.id = ? AND c.is_active = 1`,
    [id],
  );
}

/**
 * Active cars whose brand and model contain `name`, for an availability
 * check named in words. The name is bound as a LIKE pattern with its own
 * wildcards escaped, so "%" in the input matches a percent sign, not everything.
 */
export async function findAdvisorCarsByName(name: string): Promise<AdvisorCarRow[]> {
  const pattern = `%${name.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return query<AdvisorCarRow>(
    `SELECT c.id, c.brand, c.model, c.year, c.seats, c.fuel_type, c.transmission,
            c.price_per_day, c.image_url, c.description, b.name AS branch_name
       FROM cars c
       JOIN branches b ON b.id = c.branch_id
      WHERE c.is_active = 1 AND (CONCAT(c.brand, ' ', c.model) LIKE ? OR c.model LIKE ?)
      ORDER BY c.id
      LIMIT 3`,
    [pattern, pattern],
  );
}
