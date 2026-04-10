import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/adminAuth', () => ({ isAdminAuthenticated: vi.fn() }));
vi.mock('@/lib/quotaStore', () => ({
  updateAllQuotasSafely: vi.fn(),
  getConfig: vi.fn(),
}));

import { POST } from '@/app/api/admin/quotas/reset/route';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { updateAllQuotasSafely, getConfig } from '@/lib/quotaStore';

const mockIsAdmin = vi.mocked(isAdminAuthenticated);

function makeRequest(body: object) {
  return new Request('http://localhost/api/admin/quotas/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/quotas/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 20, resolution: '1024' });
    vi.mocked(updateAllQuotasSafely).mockImplementation(async (fn) => {
      fn({});
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST(makeRequest({ nickname: 'alice' }));
    expect(res.status).toBe(401);
  });

  it('resets all quotas when nickname is ALL', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makeRequest({ nickname: 'ALL', amount: 20 }));
    expect(res.status).toBe(200);
    expect(updateAllQuotasSafely).toHaveBeenCalled();
  });

  it('deletes student when action is DELETE', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const quotas = { alice: { usage: 5, pin: 'hash' } };
    vi.mocked(updateAllQuotasSafely).mockImplementation(async (fn) => { fn(quotas); });
    const res = await POST(makeRequest({ nickname: 'alice', action: 'DELETE' }));
    expect(res.status).toBe(200);
  });

  it('adds quota when action is ADD', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makeRequest({ nickname: 'alice', action: 'ADD', amount: 5 }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when nickname is missing (not ALL and no action)', async () => {
    mockIsAdmin.mockResolvedValue(true);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
