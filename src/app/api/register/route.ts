import { NextResponse } from 'next/server';
import { getQuotas, saveQuotas } from '@/lib/quotaStore';

export async function POST(request: Request) {
  try {
    const { nickname, pin } = await request.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: 'Nickname and pin are required' }, { status: 400 });
    }

    const quotas = getQuotas();
    
    // If the user already exists, update their PIN but keep usage.
    // If they don't exist, create a new record with 0 usage.
    const existingUser = quotas[nickname];
    
    if (existingUser) {
      quotas[nickname] = { usage: existingUser.usage, pin: pin };
    } else {
      quotas[nickname] = { usage: 0, pin: pin };
    }

    saveQuotas(quotas);

    return NextResponse.json({ success: true, message: `Student ${nickname} registered/updated` });
  } catch (error: any) {
    console.error('Error registering student:', error);
    return NextResponse.json({ error: error.message || 'Failed to register student' }, { status: 500 });
  }
}