import { NextResponse } from 'next/server';
import { updateAllQuotasSafely, getConfig } from '@/lib/quotaStore';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nickname, action, amount } = await request.json();
    const config = await getConfig();
    const targetAmount = amount === undefined ? config.maxQuota : amount;
    const targetUsage = config.maxQuota - targetAmount;

    if (nickname === 'ALL') {
       // Reset everyone
       await updateAllQuotasSafely((quotas) => {
           Object.keys(quotas).forEach(key => {
               quotas[key].usage = targetUsage;
           });
       });
       return NextResponse.json({ success: true, message: `All quotas reset to ${targetAmount}` });
    }

    if (!nickname) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }

    if (action === 'DELETE') {
       await updateAllQuotasSafely((quotas) => {
           delete quotas[nickname];
       });
       return NextResponse.json({ success: true, message: `Student ${nickname} removed` });
    }

    if (action === 'ADD') {
        await updateAllQuotasSafely((quotas) => {
            const existing = quotas[nickname];
            if (existing) {
                // "Adding" quota means subtracting from usage. Don't let usage go below 0.
                const newUsage = Math.max(0, existing.usage - targetAmount);
                quotas[nickname] = { usage: newUsage, pin: existing.pin };
            }
        });
        return NextResponse.json({ success: true, message: `Added ${targetAmount} quota to ${nickname}` });
    }

    // Default action: RESET
    await updateAllQuotasSafely((quotas) => {
        const existing = quotas[nickname];
        if (existing) {
            quotas[nickname] = { usage: targetUsage, pin: existing.pin };
        }
    });

    return NextResponse.json({ success: true, message: `Quota reset for ${nickname}` });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}