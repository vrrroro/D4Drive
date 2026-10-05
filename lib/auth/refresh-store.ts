import type { RowDataPacket } from 'mysql2/promise';
import { execute, withTransaction } from '@/lib/db';

/**
 * Server-side record of issued refresh tokens.
 *
 * A signed JWT alone cannot be revoked before it expires, and a refresh token
 * lives for a week. Recording each token's jti is what makes rotation mean
 * something: the presented token is retired on use, and a retired token that
 * comes back is evidence that someone copied it.
 */

export type Role = 'customer' | 'admin';

/**
 * A retired token presented again inside this window is treated as two tabs
 * refreshing at once, not as theft. Both tabs share one cookie jar, so the
 * loser of that race already holds the winner's new cookies.
 */
const RACE_GRACE_SECONDS = 10;

export async function recordRefreshToken(
  jti: string,
  userId: number,
  expiresAt: Date,
): Promise<void> {
  await execute('INSERT INTO refresh_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)', [
    jti,
    userId,
    expiresAt,
  ]);
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await execute(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = ? AND revoked_at IS NULL',
    [jti],
  );
}

interface TokenRow extends RowDataPacket {
  user_id: number;
  expired: number;
  revoked: number;
  in_grace: number;
}

interface RoleRow extends RowDataPacket {
  role: Role;
}

export type RotationResult =
  | { kind: 'rotated'; role: Role }
  | { kind: 'invalid' }
  | { kind: 'superseded' }
  | { kind: 'reused' };

/**
 * Retires `jti` and records `nextJti` as its successor, in one transaction.
 *
 * The row lock is what stops two concurrent requests both rotating the same
 * token: the second blocks until the first commits, then sees it revoked.
 *
 * The role is re-read from `users` rather than copied from the old token, so
 * a demoted admin loses admin on their next refresh instead of keeping it for
 * a week.
 */
export async function rotateRefreshToken(
  jti: string,
  userId: number,
  nextJti: string,
  nextExpiresAt: Date,
): Promise<RotationResult> {
  return withTransaction(async (connection) => {
    const [rows] = await connection.execute<TokenRow[]>(
      `SELECT user_id,
              expires_at <= NOW() AS expired,
              revoked_at IS NOT NULL AS revoked,
              revoked_at > NOW() - INTERVAL ? SECOND AS in_grace
         FROM refresh_tokens
        WHERE jti = ?
        FOR UPDATE`,
      [RACE_GRACE_SECONDS, jti],
    );

    const row = rows[0];
    if (!row || Number(row.user_id) !== userId || Number(row.expired) === 1) {
      return { kind: 'invalid' };
    }

    if (Number(row.revoked) === 1) {
      if (Number(row.in_grace) === 1) return { kind: 'superseded' };

      // Reuse of a retired token. Whoever holds it, it is not the client that
      // rotated it last, so every live session for this user ends here. The
      // transaction still commits: the revocation is the point.
      await connection.execute(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [userId],
      );
      return { kind: 'reused' };
    }

    const [users] = await connection.execute<RoleRow[]>('SELECT role FROM users WHERE id = ?', [
      userId,
    ]);
    const user = users[0];
    if (!user) return { kind: 'invalid' };

    await connection.execute(
      'INSERT INTO refresh_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)',
      [nextJti, userId, nextExpiresAt],
    );
    await connection.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = ? WHERE jti = ?',
      [nextJti, jti],
    );

    return { kind: 'rotated', role: user.role };
  });
}
