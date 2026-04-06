import { NextResponse } from 'next/server';
import { getQuotas, updateQuotaSafely } from '@/lib/quotaStore';

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: 'Nickname and pin are required' }, { status: 400 });
    }

    const quotas = await getQuotas();
    const existingUser = quotas[nickname];
    
    // Validate PIN if user already exists
    if (existingUser) {
      if (existingUser.pin !== pin) {
        return NextResponse.json({ error: '등록된 별명입니다. 올바른 PIN을 입력해주세요.' }, { status: 401 });
      }
      // If PIN matches, just return success without modifying usage
      return NextResponse.json({ success: true, message: `Student ${nickname} logged in` });
    }

    // Register new user safely
    await updateQuotaSafely(nickname, () => {
      return { usage: 0, pin: pin };
    });

    return NextResponse.json({ success: true, message: `Student ${nickname} registered` });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error registering student:', error.message);
      return NextResponse.json({ error: error.message || 'Failed to register student' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}