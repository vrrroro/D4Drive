import type { RowDataPacket } from 'mysql2/promise';
import { query, queryOne } from '@/lib/db';

export interface BranchRow extends RowDataPacket {
  id: number;
  name: string;
  address: string;
  city: string;
  phone: string;
}

/** Active branches, for the footer and the landing film's copy. */
export async function listActiveBranches(): Promise<BranchRow[]> {
  return query<BranchRow>(
    'SELECT id, name, address, city, phone FROM branches WHERE is_active = 1 ORDER BY id',
  );
}

interface FleetSummaryRow extends RowDataPacket {
  cars: number;
  branches: number;
  min_rate: string | null;
}

export interface FleetSummary {
  cars: number;
  branches: number;
  minRate: number | null;
}

/** Real counts for copy that would otherwise invent a number. */
export async function getFleetSummary(): Promise<FleetSummary> {
  const row = await queryOne<FleetSummaryRow>(
    `SELECT
       (SELECT COUNT(*) FROM cars WHERE is_active = 1)       AS cars,
       (SELECT COUNT(*) FROM branches WHERE is_active = 1)   AS branches,
       (SELECT MIN(price_per_day) FROM cars WHERE is_active = 1) AS min_rate`,
  );
  return {
    cars: Number(row?.cars ?? 0),
    branches: Number(row?.branches ?? 0),
    minRate: row?.min_rate === null || row?.min_rate === undefined ? null : Number(row.min_rate),
  };
}

interface PhotoRow extends RowDataPacket {
  image_url: string;
}

/** Photographs of the active fleet, for decorative uses like the wordmark. */
export async function listFleetPhotos(limit = 7): Promise<string[]> {
  const rows = await query<PhotoRow>(
    'SELECT image_url FROM cars WHERE is_active = 1 AND image_url IS NOT NULL ORDER BY id LIMIT ?',
    [limit],
  );
  return rows.map((r) => r.image_url);
}

/** "8043120890" as a Bengaluru landline reads: "080 4312 0890". */
export function formatPhone(phone: string): { display: string; href: string } {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('80')) {
    return { display: `0${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`, href: `tel:+91${digits}` };
  }
  if (digits.length === 10) {
    return { display: `${digits.slice(0, 5)} ${digits.slice(5)}`, href: `tel:+91${digits}` };
  }
  return { display: phone, href: `tel:${digits}` };
}
