import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/quotaStore';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const newConfig = await request.json();
    await saveConfig(newConfig);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
