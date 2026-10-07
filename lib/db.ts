import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * One pool for the whole application.
 *
 * Next's dev server re-evaluates modules on hot reload. Without the global
 * guard below, every edit leaks a fresh pool and MySQL runs out of connections
 * after a few dozen saves.
 */
declare global {
  // `var`, not `let`: only `var` declares a property on globalThis here.
  var __d4drivePool: Pool | undefined;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function createPool(): Pool {
  return mysql.createPool({
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_NAME'),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    queueLimit: 0,
    // Keeps DECIMAL columns as strings rather than lossy JS numbers. Money is
    // converted deliberately at the boundary, never implicitly.
    decimalNumbers: false,
    timezone: 'Z',
    charset: 'utf8mb4_unicode_ci',
    // Hard off. Multiple statements per call turns any injection slip into a
    // full arbitrary-SQL execution rather than a single-query problem.
    multipleStatements: false,
  });
}

export const pool: Pool = globalThis.__d4drivePool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__d4drivePool = pool;
}

/**
 * Parameterised SELECT.
 *
 * There is deliberately no variant of this that accepts a pre-built string with
 * values already inside it. If unsafe usage is possible, eventually someone
 * reaches for it under time pressure.
 */
export async function query<T extends RowDataPacket>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  // mysql2 types the parameter array narrowly. The cast is confined to these
  // two helpers so no call site ever has to reach for `any`.
  const [rows] = await pool.execute<T[]>(sql, params as never[]);
  return rows;
}

/** Parameterised SELECT returning at most one row. */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Parameterised INSERT, UPDATE, or DELETE. */
export async function execute(
  sql: string,
  params: readonly unknown[] = [],
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as never[]);
  return result;
}

/**
 * Runs `fn` inside a transaction.
 *
 * Commits on return, rolls back on throw, and releases the connection in a
 * `finally` so a thrown error inside the rollback itself cannot leak it back
 * to the pool in a dirty state.
 */
export async function withTransaction<T>(
  fn: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // A failed rollback means the connection is unusable. Releasing it below
      // returns it to the pool, where mysql2 will discard it on next health
      // check. Swallowing here preserves the original error for the caller,
      // which is the one that actually explains what went wrong.
    }
    throw error;
  } finally {
    connection.release();
  }
}

export type { PoolConnection, RowDataPacket, ResultSetHeader };
