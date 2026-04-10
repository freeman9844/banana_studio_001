import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    logger.error('ADMIN_ID and ADMIN_PASSWORD environment variables are required');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { id, password } = await request.json();

    if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
