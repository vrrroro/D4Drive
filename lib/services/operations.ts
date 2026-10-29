import type { RowDataPacket } from 'mysql2/promise';
import { callProcedure } from '@/lib/db';

export interface CloseStep {
  step: number;
  reference: string;
  fromStatus: string;
  toStatus: string;
}

export interface EndOfDayResult {
  activated: number;
  completed: number;
  deliveriesReturned: number;
  sessionsPurged: number;
  steps: CloseStep[];
}

interface SummaryRow extends RowDataPacket {
  activated: number;
  completed: number;
  deliveries_returned: number;
  sessions_purged: number;
}

interface StepRow extends RowDataPacket {
  step: number;
  reference: string;
  from_status: string;
  to_status: string;
}

/**
 * The branch closing routine: `sp_end_of_day_close` (database/routines.sql).
 *
 * Its cursor walks every booking whose day has come and moves it on:
 * confirmed bookings whose pickup day has arrived become active, active ones
 * whose return day has arrived become completed (a delivered car is marked
 * returned). Each step fires the history trigger with the admin as actor. It
 * then deletes sessions that expired more than a day ago.
 *
 * Safe to run any number of times a day: a second run finds nothing due.
 */
export async function runEndOfDayClose(actorId: number): Promise<EndOfDayResult> {
  const [summaryRows, stepRows] = await callProcedure('CALL sp_end_of_day_close(?)', [actorId]);
  const summary = summaryRows?.[0] as SummaryRow | undefined;
  return {
    activated: Number(summary?.activated ?? 0),
    completed: Number(summary?.completed ?? 0),
    deliveriesReturned: Number(summary?.deliveries_returned ?? 0),
    sessionsPurged: Number(summary?.sessions_purged ?? 0),
    steps: ((stepRows ?? []) as StepRow[]).map((row) => ({
      step: row.step,
      reference: row.reference,
      fromStatus: row.from_status,
      toStatus: row.to_status,
    })),
  };
}
