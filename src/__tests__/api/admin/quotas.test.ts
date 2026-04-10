import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/adminAuth', () => ({
  isAdminAuthenticated: vi.fn(),
}));
vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  getConfig: vi.fn(),
}));

import { GET } from '@/app/api/admin/quotas/route';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { getQuotas, getConfig } from '@/lib/quotaStore';

const mockIsAdmin = vi.mocked(isAdminAuthenticated);
const mockGetQuotas = vi.mocked(getQuotas);
const mockGetConfig = vi.mocked(getConfig);

describe('GET /api/admin/quotas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns quota list without pin field', async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockGetQuotas.mockResolvedValue({
      alice: { usage: 3, pin: '$2b$10$hashedpin' },
      bob: { usage: 0, pin: '$2b$10$hashedpin2' },
    });
    mockGetConfig.mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.quotas).toHaveLength(2);
    expect(data.quotas[0]).not.toHaveProperty('pin');
    expect(data.quotas[0]).toHaveProperty('nickname');
    expect(data.quotas[0]).toHaveProperty('usage');
    expect(data.quotas[0]).toHaveProperty('remaining');
  });
});
