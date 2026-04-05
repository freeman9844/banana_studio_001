import { NextResponse } from 'next/server';
import { getQuotas, saveQuotas } from '@/lib/quotaStore';

export async function POST(request: Request) {
  try {
    const { nickname, action, amount } = await request.json();
    const quotas = getQuotas();
    const targetAmount = amount === undefined ? 20 : amount;
    const targetUsage = 20 - targetAmount;

    if (nickname === 'ALL') {
       // Reset everyone
       Object.keys(quotas).forEach(key => {
           quotas[key].usage = targetUsage;
       });
       saveQuotas(quotas);
       return NextResponse.json({ success: true, message: `All quotas reset to ${targetAmount}` });
    }

    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    if (action === 'DELETE') {
       delete quotas[nickname];
       saveQuotas(quotas);
       return NextResponse.json({ success: true, message: `Student ${nickname} removed` });
    }

    if (action === 'ADD') {
        const existing = quotas[nickname];
        if (existing) {
            // "Adding" quota means subtracting from usage. Don't let usage go below 0.
            const newUsage = Math.max(0, existing.usage - targetAmount);
            quotas[nickname] = { usage: newUsage, pin: existing.pin };
            saveQuotas(quotas);
        }
        return NextResponse.json({ success: true, message: `Added ${targetAmount} quota to ${nickname}` });
    }

    // Default action: RESET
    const existing = quotas[nickname];
    if (existing) {
        quotas[nickname] = { usage: targetUsage, pin: existing.pin };
        saveQuotas(quotas);
    }

    return NextResponse.json({ success: true, message: `Quota reset for ${nickname}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}