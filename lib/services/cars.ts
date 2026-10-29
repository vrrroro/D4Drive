import type { RowDataPacket } from 'mysql2/promise';
import { query, queryOne } from '@/lib/db';
import type { CarFilterInput } from '@/lib/validation/schemas';

export interface CarRow extends RowDataPacket {
  id: number;
  branch_id: number;
  branch_name: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: string;
  transmission: string;
  seats: number;
  price_per_day: string;
  image_url: string | null;
  description: string | null;
}

/**
 * Maps an allowlisted sort key to a literal ORDER BY clause.
 *
 * A column name cannot be a bound parameter, which is exactly why dynamic
 * sorting is the usual place SQL injection creeps back into an otherwise
 * parameterised codebase. The client sends a key, never a column, and an
 * unrecognised key falls through to the default rather than being interpolated.
 */
const SORT_CLAUSES = {
  price_asc: 'c.price_per_day ASC',
  price_desc: 'c.price_per_day DESC',
  seats: 'c.seats ASC, c.price_per_day ASC',
  newest: 'c.year DESC, c.id DESC',
} as const;

interface CountRow extends RowDataPacket {
  total: number;
}

export interface CarListResult {
  cars: CarRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listCars(filters: CarFilterInput): Promise<CarListResult> {
  const clauses: string[] = ['c.is_active = 1'];
  const params: unknown[] = [];

  // Every filter appends a placeholder and pushes its value. No value is ever
  // interpolated into the string, not even an integer.
  if (filters.brand) {
    clauses.push('c.brand = ?');
    params.push(filters.brand);
  }
  if (filters.fuel) {
    clauses.push('c.fuel_type = ?');
    params.push(filters.fuel);
  }
  if (filters.transmission) {
    clauses.push('c.transmission = ?');
    params.push(filters.transmission);
  }
  if (filters.seats !== undefined) {
    clauses.push('c.seats = ?');
    params.push(filters.seats);
  }
  if (filters.minPrice !== undefined) {
    clauses.push('c.price_per_day >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    clauses.push('c.price_per_day <= ?');
    params.push(filters.maxPrice);
  }

  const where = clauses.join(' AND ');
  const orderBy = SORT_CLAUSES[filters.sort] ?? SORT_CLAUSES.newest;

  const countRow = await queryOne<CountRow>(
    `SELECT COUNT(*) AS total FROM cars c WHERE ${where}`,
    params,
  );
  const total = countRow?.total ?? 0;

  const offset = (filters.page - 1) * filters.pageSize;

  const cars = await query<CarRow>(
    `SELECT c.id, c.branch_id, b.name AS branch_name, c.brand, c.model, c.year,
            c.fuel_type, c.transmission, c.seats, c.price_per_day,
            c.image_url, c.description
       FROM cars c
       JOIN branches b ON b.id = c.branch_id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, filters.pageSize, offset],
  );

  return {
    cars,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export interface CarDetailRow extends CarRow {
  branch_latitude: string;
  branch_longitude: string;
  branch_address: string;
  branch_phone: string;
  registration_no: string;
}

export async function getCar(id: number): Promise<CarDetailRow | null> {
  return queryOne<CarDetailRow>(
    `SELECT c.id, c.branch_id, b.name AS branch_name, b.address AS branch_address,
            b.phone AS branch_phone,
            b.latitude AS branch_latitude, b.longitude AS branch_longitude,
            c.brand, c.model, c.year, c.registration_no, c.fuel_type,
            c.transmission, c.seats, c.price_per_day, c.image_url, c.description
       FROM cars c
       JOIN branches b ON b.id = c.branch_id
      WHERE c.id = ? AND c.is_active = 1`,
    [id],
  );
}

interface BrandRow extends RowDataPacket {
  brand: string;
}

export async function listBrands(): Promise<string[]> {
  const rows = await query<BrandRow>(
    'SELECT DISTINCT brand FROM cars WHERE is_active = 1 ORDER BY brand',
  );
  return rows.map((r) => r.brand);
}
