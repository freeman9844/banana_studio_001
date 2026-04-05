import { NextResponse } from 'next/server';
import { getQuotas } from '@/lib/quotaStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get('nickname');

  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
  }

  const quotas = getQuotas();
  const userData = quotas[nickname];
  
  const usage = userData ? userData.usage : 0;
  const remainingQuota = Math.max(0, 20 - usage);

  return NextResponse.json({ remainingQuota });
}