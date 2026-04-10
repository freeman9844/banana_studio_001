import { NextResponse } from 'next/server';
import { getQuotas, getConfig } from '@/lib/quotaStore';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quotas = await getQuotas();
  const config = await getConfig();

  const quotasList = Object.entries(quotas).map(([nickname, data]) => ({
    nickname,
    usage: data.usage,
    pin: data.pin,
    remaining: Math.max(0, config.maxQuota - data.usage),
  }));

  return NextResponse.json({ quotas: quotasList, config });
}
