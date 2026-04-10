import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/quotaStore', () => ({
  getQuotas: vi.fn(),
  getConfig: vi.fn(),
  updateQuotaSafely: vi.fn(),
}));

import { validateUserQuota } from '@/lib/quotaHelpers';
import { getQuotas, getConfig, updateQuotaSafely } from '@/lib/quotaStore';

const mockGetQuotas = vi.mocked(getQuotas);
const mockGetConfig = vi.mocked(getConfig);
const mockUpdateQuotaSafely = vi.mocked(updateQuotaSafely);

describe('validateUserQuota', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error for unknown user', async () => {
    mockGetQuotas.mockResolvedValue({});
    mockGetConfig.mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const result = await validateUserQuota('unknown', '1234');

    expect(result.error).toBe('등록되지 않은 사용자입니다.');
    expect(result.status).toBe(401);
  });

  it('validates hashed PIN correctly', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: hashedPin } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });

    const result = await validateUserQuota('alice', '1234');

    expect(result.error).toBeNull();
    expect(result.userData).toBeDefined();
  });

  it('rejects wrong PIN', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: hashedPin } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });

    const result = await validateUserQuota('alice', 'wrong');

    expect(result.error).toBe('잘못된 PIN 번호입니다.');
    expect(result.status).toBe(401);
  });

  it('accepts plain-text PIN and triggers migration', async () => {
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: '1234' } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });
    mockUpdateQuotaSafely.mockResolvedValue({ usage: 0, pin: 'hashed' });

    const result = await validateUserQuota('alice', '1234');

    expect(result.error).toBeNull();
    expect(mockUpdateQuotaSafely).toHaveBeenCalledWith('alice', expect.any(Function));
  });

  it('rejects wrong plain-text PIN without migration', async () => {
    mockGetQuotas.mockResolvedValue({ alice: { usage: 0, pin: '1234' } });
    mockGetConfig.mockResolvedValue({ maxQuota: 20, resolution: '1024' });

    const result = await validateUserQuota('alice', 'wrong');

    expect(result.error).toBe('잘못된 PIN 번호입니다.');
    expect(mockUpdateQuotaSafely).not.toHaveBeenCalled();
  });

  it('returns quota exceeded error', async () => {
    const hashedPin = await bcrypt.hash('1234', 10);
    mockGetQuotas.mockResolvedValue({ alice: { usage: 10, pin: hashedPin } });
    mockGetConfig.mockResolvedValue({ maxQuota: 10, resolution: '1024' });

    const result = await validateUserQuota('alice', '1234');

    expect(result.error).toContain('오늘은 마법을 다 썼어요');
    expect(result.status).toBe(429);
  });
});
