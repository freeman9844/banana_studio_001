import { NextResponse } from 'next/server';
import { updateAllQuotasSafely, getConfig } from '@/lib/quotaStore';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nickname, action, amount } = await request.json();
    const config = await getConfig();
    const targetAmount = amount === undefined ? config.maxQuota : amount;
    const targetUsage = config.maxQuota - targetAmount;

    if (nickname === 'ALL') {
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
          quotas[nickname] = { usage: Math.max(0, existing.usage - targetAmount), pin: existing.pin };
        }
      });
      return NextResponse.json({ success: true, message: `Added ${targetAmount} quota to ${nickname}` });
    }

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
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
