import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { queryOne } from '@/lib/db';
import { requireSession, handleRouteError } from '@/lib/auth/guards';

interface MeRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
}

export async function GET() {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const user = await queryOne<MeRow>(
      'SELECT id, full_name, email, phone, role FROM users WHERE id = ?',
      [auth.session.userId],
    );

    // A valid token for a deleted user is not a session.
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return handleRouteError('auth/me', error);
  }
}
