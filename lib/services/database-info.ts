import type { RowDataPacket } from 'mysql2/promise';
import { query, queryOne } from '@/lib/db';

/**
 * What the database itself says it contains, for the admin "How the
 * database works" page. Read from information_schema, so the page proves the
 * routines and triggers exist rather than claiming they do.
 */

export const TABLES = [
  'users', 'branches', 'cars', 'bookings', 'deliveries', 'payments',
  'refresh_tokens', 'booking_status_log',
] as const;

export interface TableCount {
  table: string;
  rows: number;
}

type CountsRow = RowDataPacket & Record<(typeof TABLES)[number], number>;

/** Exact counts (information_schema.TABLE_ROWS is only an estimate). */
export async function tableCounts(): Promise<TableCount[]> {
  // The table names are this module's own constants, never input, and an
  // identifier cannot be a bound parameter.
  const row = await queryOne<CountsRow>(
    `SELECT ${TABLES.map((t) => `(SELECT COUNT(*) FROM ${t}) AS ${t}`).join(', ')}`,
  );
  return TABLES.map((t) => ({ table: t, rows: Number(row?.[t] ?? 0) }));
}

export interface RoutineInfo extends RowDataPacket {
  name: string;
  type: 'FUNCTION' | 'PROCEDURE';
}

export async function listRoutines(): Promise<RoutineInfo[]> {
  return query<RoutineInfo>(
    `SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS type
       FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
      ORDER BY ROUTINE_TYPE, ROUTINE_NAME`,
  );
}

export interface TriggerInfo extends RowDataPacket {
  name: string;
  timing: string;
  event: string;
  table_name: string;
}

export async function listTriggers(): Promise<TriggerInfo[]> {
  return query<TriggerInfo>(
    `SELECT TRIGGER_NAME AS name, ACTION_TIMING AS timing,
            EVENT_MANIPULATION AS event, EVENT_OBJECT_TABLE AS table_name
       FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = DATABASE()
      ORDER BY EVENT_OBJECT_TABLE, ACTION_ORDER`,
  );
}

export interface ConstraintCount extends RowDataPacket {
  kind: string;
  n: number;
}

export async function constraintCounts(): Promise<ConstraintCount[]> {
  return query<ConstraintCount>(
    `SELECT CONSTRAINT_TYPE AS kind, COUNT(*) AS n
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
      GROUP BY CONSTRAINT_TYPE
      ORDER BY FIELD(CONSTRAINT_TYPE, 'PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')`,
  );
}
