import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { queryOne } from '@/lib/db';
import { loginSchema } from '@/lib/validation/schemas';
import { verifyPassword, fakeVerify } from '@/lib/auth/hash';
import { setSessionCookies } from '@/lib/auth/cookies';
import { errors, handleRouteError } from '@/lib/auth/guards';
import { limitAuthAttempt } from '@/lib/auth/rate-limit';

interface UserRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'customer' | 'admin';
}

/**
 * Login.
 *
 * Note what this route does NOT do: it never distinguishes an unknown email
 * from a wrong password, in the response body or in the time it takes. Both
 * paths run a hash comparison and both return the identical message, because
 * anything else is an account-enumeration oracle.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (body === null) return errors.badRequest('Send a JSON body.');

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errors.badRequest('Enter your email and password.');
    }

    const { email, password } = parsed.data;

    const limit = limitAuthAttempt(request, email);
    if (!limit.allowed) return errors.tooMany(limit.retryAfterSeconds);

    const user = await queryOne<UserRow>(
      'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?',
      [email],
    );

    if (!user) {
      // Burn equivalent CPU so response time does not reveal that the address
      // is unregistered.
      await fakeVerify(password);
      return NextResponse.json(
        { error: 'Those details did not match. Try again.' },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Those details did not match. Try again.' },
        { status: 401 },
      );
    }

    await setSessionCookies(user.id, user.role);

    // The hash never appears in a response body, at any status code.
    return NextResponse.json({
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    });
  } catch (error) {
    return handleRouteError('auth/login', error);
  }
}
