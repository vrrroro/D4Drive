import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * Refresh token rotation against a live MySQL.
 *
 * Skips without a database, like the double-booking test. The properties
 * worth proving are the ones a unit test cannot: that a retired token is
 * refused, that replaying one outside the race window revokes the whole
 * family, and that the role comes from the users table rather than the token.
 */

const CONFIGURED = Boolean(process.env.DB_NAME && process.env.DB_HOST);

if (!CONFIGURED) {
  test('refresh rotation (skipped, no database configured)', { skip: true }, () => {});
} else {
  const { pool, execute, query } = await import('../lib/db.ts');
  const { recordRefreshToken, rotateRefreshToken, revokeRefreshToken } = await import(
    '../lib/auth/refresh-store.ts'
  );

  let userId: number;
  const inAWeek = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const id = () => crypto.randomUUID();

  before(async () => {
    const users = await query<RowDataPacket & { id: number }>(
      "SELECT id FROM users WHERE role = 'customer' LIMIT 1",
    );
    assert.ok(users[0], 'seed data required: run npm run db:setup first');
    userId = users[0].id;
    await execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  });

  after(async () => {
    await execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    await pool.end();
  });

  test('rotation retires the old token and returns the role from users', async () => {
    const first = id();
    const second = id();
    await recordRefreshToken(first, userId, inAWeek());

    const result = await rotateRefreshToken(first, userId, second, inAWeek());
    assert.deepEqual(result, { kind: 'rotated', role: 'customer' });

    const rows = await query<RowDataPacket & { replaced_by: string | null; revoked: number }>(
      'SELECT replaced_by, revoked_at IS NOT NULL AS revoked FROM refresh_tokens WHERE jti = ?',
      [first],
    );
    assert.equal(rows[0]?.replaced_by, second);
    assert.equal(Number(rows[0]?.revoked), 1);
  });

  test('a token presented moments after rotation is superseded, not theft', async () => {
    const first = id();
    await recordRefreshToken(first, userId, inAWeek());
    await rotateRefreshToken(first, userId, id(), inAWeek());

    const again = await rotateRefreshToken(first, userId, id(), inAWeek());
    assert.equal(again.kind, 'superseded');
  });

  test('replaying a retired token revokes every live token for the user', async () => {
    const old = id();
    const live = id();
    await recordRefreshToken(old, userId, inAWeek());
    await recordRefreshToken(live, userId, inAWeek());
    // Retired well outside the race window.
    await execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() - INTERVAL 1 HOUR WHERE jti = ?',
      [old],
    );

    const result = await rotateRefreshToken(old, userId, id(), inAWeek());
    assert.equal(result.kind, 'reused');

    const liveResult = await rotateRefreshToken(live, userId, id(), inAWeek());
    assert.notEqual(liveResult.kind, 'rotated', 'the family must be revoked');
  });

  test('unknown, foreign, expired, and logged-out tokens are invalid', async () => {
    assert.equal((await rotateRefreshToken(id(), userId, id(), inAWeek())).kind, 'invalid');

    const foreign = id();
    await recordRefreshToken(foreign, userId, inAWeek());
    assert.equal((await rotateRefreshToken(foreign, userId + 9999, id(), inAWeek())).kind, 'invalid');

    const expired = id();
    await recordRefreshToken(expired, userId, new Date(Date.now() - 1000));
    assert.equal((await rotateRefreshToken(expired, userId, id(), inAWeek())).kind, 'invalid');

    const loggedOut = id();
    await recordRefreshToken(loggedOut, userId, inAWeek());
    await revokeRefreshToken(loggedOut);
    assert.notEqual((await rotateRefreshToken(loggedOut, userId, id(), inAWeek())).kind, 'rotated');
  });

  test('two concurrent rotations of one token produce exactly one new token', async () => {
    const token = id();
    await recordRefreshToken(token, userId, inAWeek());

    const results = await Promise.all([
      rotateRefreshToken(token, userId, id(), inAWeek()),
      rotateRefreshToken(token, userId, id(), inAWeek()),
    ]);
    const kinds = results.map((r) => r.kind).sort();
    assert.deepEqual(kinds, ['rotated', 'superseded']);
  });
}
