import { NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/auth/cookies';
import { handleRouteError } from '@/lib/auth/guards';

export async function POST() {
  try {
    await clearSessionCookies();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError('auth/logout', error);
  }
}
