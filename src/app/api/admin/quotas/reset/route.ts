import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { nickname, action } = await request.json();
    
    const globalAny: any = global;
    if (!globalAny.userQuotas) {
      globalAny.userQuotas = new Map<string, { usage: number, pin: string }>();
    }
    
    const userQuotas = globalAny.userQuotas as Map<string, { usage: number, pin: string }>;

    if (nickname === 'ALL') {
       // Reset everyone
       userQuotas.clear();
       return NextResponse.json({ success: true, message: 'All quotas reset/deleted' });
    }

    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    if (action === 'DELETE') {
       userQuotas.delete(nickname);
       return NextResponse.json({ success: true, message: `Student ${nickname} removed` });
    }

    // Reset specific user by setting usage to 0 (or removing them from the map)
    const existing = userQuotas.get(nickname);
    if (existing) {
        userQuotas.set(nickname, { usage: 0, pin: existing.pin });
    }

    return NextResponse.json({ success: true, message: `Quota reset for ${nickname}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}