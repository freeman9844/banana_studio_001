import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  getConfig: vi.fn(),
}));

import { GET } from '@/app/api/quota/route';
import { getQuotas, getConfig } from '@/lib/quotaStore';

describe('GET /api/quota', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when nickname missing', async () => {
    const req = new Request('http://localhost/api/quota');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns remainingQuota for known user', async () => {
    vi.mocked(getQuotas).mockResolvedValue({ alice: { usage: 3, pin: 'hash' } });
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });
    const req = new Request('http://localhost/api/quota?nickname=alice');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.remainingQuota).toBe(7);
  });

  it('returns maxQuota for unknown user', async () => {
    vi.mocked(getQuotas).mockResolvedValue({});
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });
    const req = new Request('http://localhost/api/quota?nickname=unknown');
    const res = await GET(req);
    const data = await res.json();
    expect(data.remainingQuota).toBe(10);
  });

  it('clamps remainingQuota to 0 when usage exceeds maxQuota', async () => {
    vi.mocked(getQuotas).mockResolvedValue({ alice: { usage: 25, pin: 'hash' } });
    vi.mocked(getConfig).mockResolvedValue({ maxQuota: 10, resolution: '1024' });
    const req = new Request('http://localhost/api/quota?nickname=alice');
    const res = await GET(req);
    const data = await res.json();
    expect(data.remainingQuota).toBe(0);
  });
});
