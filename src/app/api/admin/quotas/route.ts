import { NextResponse } from 'next/server';
import { getQuotas } from '@/lib/quotaStore';

export async function GET() {
  const quotas = getQuotas();
  
  // Convert object to Array for JSON serialization
  const quotasList = Object.entries(quotas).map(([nickname, data]) => ({
    nickname,
    usage: data.usage,
    pin: data.pin,
    remaining: 20 - data.usage // Hardcoding 20 to match the generate route
  }));

  return NextResponse.json({ quotas: quotasList });
}