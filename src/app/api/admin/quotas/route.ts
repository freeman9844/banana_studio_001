import { NextResponse } from 'next/server';
import { getQuotas, getConfig } from '@/lib/quotaStore';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quotas = await getQuotas();
  const config = await getConfig();
  
  // Convert object to Array for JSON serialization
  const quotasList = Object.entries(quotas).map(([nickname, data]) => {
    return {
      nickname,
      usage: data.usage,
      pin: data.pin,
      remaining: Math.max(0, config.maxQuota - data.usage)
    };
  });

  return NextResponse.json({ quotas: quotasList, config });
}