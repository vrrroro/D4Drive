import type { RowDataPacket } from 'mysql2/promise';
import { queryOne } from '@/lib/db';

interface NameRow extends RowDataPacket {
  full_name: string;
}

/** First name for a greeting. Null if the user no longer exists. */
export async function getFirstName(userId: number): Promise<string | null> {
  const row = await queryOne<NameRow>('SELECT full_name FROM users WHERE id = ?', [userId]);
  if (!row) return null;
  return row.full_name.trim().split(/\s+/)[0] ?? null;
}
