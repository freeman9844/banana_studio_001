import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  updateQuotaSafely: vi.fn(),
}));

import { POST } from '@/app/api/register/route';
import { getQuotas, updateQuotaSafely } from '@/lib/quotaStore';

const mockGetQuotas = vi.mocked(getQuotas);
const mockUpdateQuotaSafely = vi.mocked(updateQuotaSafely);

function makeRequest(body: object) {
  return new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when nickname missing', async () => {
    const res = await POST(makeRequest({ pin: '1234' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when pin missing', async () => {
    const res = await POST(makeRequest({ nickname: 'alice' }));
    expect(res.status).toBe(400);
  });

  it('registers new user with hashed PIN', async () => {
    mockGetQuotas.mockResolvedValue({});
    mockUpdateQuotaSafely.mockImplementation(async (_nick, fn) => fn(undefined) as never);

    const res = await POST(makeRequest({ nickname: 'alice', pin: '1234' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const callFn = mockUpdateQuotaSafely.mock.calls[0][1];
    const result = callFn(undefined);
    expect((result as { pin: string }).pin).toMatch(/^\$2b\$/);
    expect((result as { usage: number }).usage).toBe(0);
  });

  it('allows existing user with correct hashed PIN', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 3, pin: hashedPin } });

    const res = await POST(makeRequest({ nickname: 'alice', pin: '1234' }));
    expect(res.status).toBe(200);
  });

  it('rejects existing user with wrong PIN', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 3, pin: hashedPin } });

    const res = await POST(makeRequest({ nickname: 'alice', pin: '9999' }));
    expect(res.status).toBe(401);
  });

  it('accepts plain-text PIN for existing user and migrates', async () => {
    mockGetQuotas.mockResolvedValue({ alice: { usage: 2, pin: '1234' } });
    mockUpdateQuotaSafely.mockImplementation(async (_nick, fn) => fn({ usage: 2, pin: '1234' }) as never);

    const res = await POST(makeRequest({ nickname: 'alice', pin: '1234' }));
    expect(res.status).toBe(200);
    expect(mockUpdateQuotaSafely).toHaveBeenCalled();
  });
});
