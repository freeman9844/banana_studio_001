import { NextResponse } from 'next/server';
import { getQuotas, saveQuotas } from '@/lib/quotaStore';

export async function POST(request: Request) {
  try {
    const { nickname, action } = await request.json();
    const quotas = getQuotas();

    if (nickname === 'ALL') {
       // Reset everyone
       saveQuotas({});
       return NextResponse.json({ success: true, message: 'All quotas reset/deleted' });
    }

    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    if (action === 'DELETE') {
       delete quotas[nickname];
       saveQuotas(quotas);
       return NextResponse.json({ success: true, message: `Student ${nickname} removed` });
    }

    // Reset specific user by setting usage to 0 (or removing them from the map)
    const existing = quotas[nickname];
    if (existing) {
        quotas[nickname] = { usage: 0, pin: existing.pin };
        saveQuotas(quotas);
    }

    return NextResponse.json({ success: true, message: `Quota reset for ${nickname}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}