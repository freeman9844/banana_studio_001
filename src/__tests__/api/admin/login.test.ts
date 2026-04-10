import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: mockSet }),
}));

describe('POST /api/admin/login', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 500 when ADMIN_ID env not set', async () => {
    delete process.env.ADMIN_ID;
    delete process.env.ADMIN_PASSWORD;
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'admin', password: 'admin' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 200 with correct credentials', async () => {
    process.env.ADMIN_ID = 'teacher';
    process.env.ADMIN_PASSWORD = 'secret123';
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'teacher', password: 'secret123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith('admin_session', 'true', expect.objectContaining({ httpOnly: true }));
  });

  it('returns 401 with wrong credentials', async () => {
    process.env.ADMIN_ID = 'teacher';
    process.env.ADMIN_PASSWORD = 'secret123';
    const { POST } = await import('@/app/api/admin/login/route');
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'wrong', password: 'wrong' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
