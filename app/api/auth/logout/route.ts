import { NextResponse } from 'next/server';
import { clearSessionCookies, readRefreshToken } from '@/lib/auth/cookies';
import { handleRouteError } from '@/lib/auth/guards';
import { revokeRefreshToken } from '@/lib/auth/refresh-store';

export async function POST() {
  try {
    // Revoke server-side as well as clearing the cookie. Clearing alone would
    // leave a copied refresh token usable for the rest of its week.
    const refresh = await readRefreshToken();
    if (refresh?.jti) await revokeRefreshToken(refresh.jti);

    await clearSessionCookies();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError('auth/logout', error);
  }
}
