import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/adminAuth', () => ({ isAdminAuthenticated: vi.fn() }));
vi.mock('@/lib/quotaStore', () => ({
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

import { GET, POST } from '@/app/api/admin/config/route';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { getConfig, saveConfig } from '@/lib/quotaStore';

const mockIsAdmin = vi.mocked(isAdminAuthenticated);

describe('GET /api/admin/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns config when authenticated', async () => {
    mockIsAdmin.mockResolvedValue(true);
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });
    const res = await GET();
    const data = await res.json();
    expect(data.maxQuota).toBe(10);
  });
});

describe('POST /api/admin/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const req = new Request('http://localhost/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxQuota: 5, resolution: '512' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('saves config when authenticated', async () => {
    mockIsAdmin.mockResolvedValue(true);
    vi.mocked(saveConfig).mockResolvedValue(undefined);
    const req = new Request('http://localhost/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxQuota: 5, resolution: '512' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(saveConfig).toHaveBeenCalledWith({ maxQuota: 5, resolution: '512' });
  });
});
