import { NextResponse } from 'next/server';
import {
  clearSessionCookies,
  nextRefreshIdentity,
  readRefreshToken,
  writeSessionCookies,
} from '@/lib/auth/cookies';
import { errors, handleRouteError } from '@/lib/auth/guards';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { rotateRefreshToken } from '@/lib/auth/refresh-store';

const REFRESH_MAX = 30;
const REFRESH_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000);

/**
 * Exchanges a refresh token for a new access and refresh pair.
 *
 * Rotation, not renewal: the presented refresh token is retired and a new one
 * issued every time. A stolen refresh token therefore works at most once
 * before the real client's next refresh exposes it, at which point every
 * session for that user is revoked (see `rotateRefreshToken`).
 *
 * Every failure is the same 401 with the cookies cleared, whether the token
 * was missing, expired, forged, or replayed. The client's only correct
 * response to any of them is to sign in again.
 */
export async function POST(request: Request) {
  try {
    const limit = rateLimit(`refresh:ip:${clientKey(request)}`, REFRESH_MAX, REFRESH_WINDOW_MS);
    if (!limit.allowed) return errors.tooMany(limit.retryAfterSeconds);

    const claims = await readRefreshToken();
    if (!claims?.jti) {
      await clearSessionCookies();
      return errors.unauthorised();
    }

    const userId = Number(claims.sub);
    const next = nextRefreshIdentity();
    const result = await rotateRefreshToken(claims.jti, userId, next.jti, next.expiresAt);

    if (result.kind === 'superseded') {
      // Another tab rotated this token a moment ago and its new cookies are
      // already in the shared jar. Clearing them here would sign that tab out.
      return errors.unauthorised();
    }

    if (result.kind !== 'rotated') {
      if (result.kind === 'reused') {
        console.warn(`[auth/refresh] retired refresh token replayed for user ${userId}`);
      }
      await clearSessionCookies();
      return errors.unauthorised();
    }

    await writeSessionCookies(userId, result.role, next.jti);
    return NextResponse.json({ user: { id: userId, role: result.role } });
  } catch (error) {
    return handleRouteError('auth/refresh', error);
  }
}
