/**
 * Errors raised inside the database, mapped to HTTP.
 *
 * The stored programs in database/routines.sql refuse bad requests with
 * SIGNAL SQLSTATE '45000' and an errno of their own. Their messages are
 * written for the customer, so they are passed through; every other database
 * error stays behind handleRouteError and is never shown.
 *
 * MySQL's own constraint errors are mapped too, where they mean the caller
 * asked for something impossible rather than that the server failed.
 */

export interface MappedDbError {
  status: 400 | 404 | 409 | 422;
  message: string;
}

/** errno -> HTTP status, for the codes routines.sql defines. */
const PROGRAM_ERRORS: Record<number, MappedDbError['status']> = {
  5001: 404, // car not found or withdrawn
  5002: 409, // car already booked for the dates
  5003: 422, // delivery or collection too far
  5004: 400, // dates invalid
  5005: 422, // collection branch unavailable
  5006: 400, // unknown delivery or payment mode
  5101: 404, // booking not found
  5102: 409, // booking cannot be cancelled now
  5201: 409, // car has rentals, cannot withdraw
};

export const DB_ERRNO = {
  carNotFound: 5001,
  carUnavailable: 5002,
  outOfRange: 5003,
  badDates: 5004,
  branchClosed: 5005,
  badMode: 5006,
  bookingNotFound: 5101,
  cannotCancel: 5102,
  carInUse: 5201,
} as const;

interface MysqlError {
  errno?: number;
  code?: string;
  sqlMessage?: string;
}

function asMysqlError(error: unknown): MysqlError | null {
  return typeof error === 'object' && error !== null && 'errno' in error
    ? (error as MysqlError)
    : null;
}

export function dbErrno(error: unknown): number | undefined {
  return asMysqlError(error)?.errno;
}

export function mapDbError(error: unknown): MappedDbError | null {
  const e = asMysqlError(error);
  if (!e || e.errno === undefined) return null;

  const status = PROGRAM_ERRORS[e.errno];
  if (status) return { status, message: e.sqlMessage ?? 'That request was refused.' };

  switch (e.code) {
    case 'ER_DUP_ENTRY':
      return { status: 409, message: 'That conflicts with an existing record.' };
    case 'ER_ROW_IS_REFERENCED_2':
      return { status: 409, message: 'Other records still depend on this one.' };
    case 'ER_NO_REFERENCED_ROW_2':
      return { status: 400, message: 'That refers to something that does not exist.' };
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return { status: 400, message: 'One of those values is not allowed.' };
    default:
      return null;
  }
}
