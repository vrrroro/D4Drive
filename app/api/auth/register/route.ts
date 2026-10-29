import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { execute, queryOne } from '@/lib/db';
import { registerSchema, fieldErrors } from '@/lib/validation/schemas';
import { hashPassword } from '@/lib/auth/hash';
import { setSessionCookies } from '@/lib/auth/cookies';
import { errors, handleRouteError } from '@/lib/auth/guards';
import { limitAuthAttempt } from '@/lib/auth/rate-limit';

interface ExistingRow extends RowDataPacket {
  id: number;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (body === null) return errors.badRequest('Send a JSON body.');

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }

    const { fullName, email, phone, password, licenceNumber } = parsed.data;

    const limit = limitAuthAttempt(request, email);
    if (!limit.allowed) return errors.tooMany(limit.retryAfterSeconds);

    const existing = await queryOne<ExistingRow>('SELECT id FROM users WHERE email = ?', [
      email,
    ]);

    if (existing) {
      // 409 is unavoidable here: a registration form cannot function without
      // telling the user the address is taken. The enumeration surface is
      // closed on the login route instead, where it actually matters.
      return errors.conflict('An account with that email already exists.');
    }

    const passwordHash = await hashPassword(password);

    const result = await execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, licence_number)
       VALUES (?, ?, ?, ?, 'customer', ?)`,
      [fullName, email, phone, passwordHash, licenceNumber ?? null],
    );

    const userId = result.insertId;
    await setSessionCookies(userId, 'customer');

    return NextResponse.json(
      { user: { id: userId, fullName, email, role: 'customer' } },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError('auth/register', error);
  }
}
