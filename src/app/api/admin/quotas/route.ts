import { NextResponse } from 'next/server';

export async function GET() {
  const globalAny: any = global;
  if (!globalAny.userQuotas) {
    globalAny.userQuotas = new Map<string, { usage: number, pin: string }>();
  }
  
  const userQuotas = globalAny.userQuotas as Map<string, { usage: number, pin: string }>;
  
  // Convert Map to Array of objects for JSON serialization
  const quotasList = Array.from(userQuotas.entries()).map(([nickname, data]) => ({
    nickname,
    usage: data.usage,
    pin: data.pin,
    remaining: 20 - data.usage // Hardcoding 20 to match the generate route
  }));

  return NextResponse.json({ quotas: quotasList });
}