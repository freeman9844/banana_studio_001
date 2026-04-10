import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/quotaStore';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const newConfig = await request.json();
    await saveConfig(newConfig);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[admin/config] POST error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
