import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/quotaStore', () => ({
  updateQuotaSafely: vi.fn(),
}));
vi.mock('@/lib/quotaHelpers', () => ({
  validateUserQuota: vi.fn(),
}));

import { handleGenerateRequest, buildAugmentedPrompt } from '@/lib/generateHelpers';
import { validateUserQuota } from '@/lib/quotaHelpers';
import { updateQuotaSafely } from '@/lib/quotaStore';

const mockValidate = vi.mocked(validateUserQuota);
const mockUpdateQuota = vi.mocked(updateQuotaSafely);

describe('handleGenerateRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 on validation failure', async () => {
    mockValidate.mockResolvedValue({
      error: '등록되지 않은 사용자입니다.',
      status: 401,
      userData: undefined,
      config: undefined,
    });

    const res = await handleGenerateRequest('alice', '1234', vi.fn());
    expect(res.status).toBe(401);
  });

  it('generates image and returns base64 data URL directly', async () => {
    mockValidate.mockResolvedValue({
      error: null,
      status: undefined,
      userData: { usage: 2, pin: 'hash' },
      config: { maxQuota: 10, resolution: '1024' },
    });
    mockUpdateQuota.mockResolvedValue({ usage: 3, pin: 'hash' });

    const generateFn = vi.fn().mockResolvedValue({ base64: 'abc123', mimeType: 'image/png' });
    const res = await handleGenerateRequest('alice', '1234', generateFn);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.imageUrl).toBe('data:image/png;base64,abc123');
    expect(data.remainingQuota).toBe(7);
  });

  it('returns 500 on AI generation failure', async () => {
    mockValidate.mockResolvedValue({
      error: null,
      status: undefined,
      userData: { usage: 0, pin: 'hash' },
      config: { maxQuota: 10, resolution: '1024' },
    });
    const generateFn = vi.fn().mockRejectedValue(new Error('AI failed'));

    const res = await handleGenerateRequest('alice', '1234', generateFn);
    expect(res.status).toBe(500);
  });
});

describe('buildAugmentedPrompt', () => {
  it('appends high quality suffix for 1024', () => {
    const result = buildAugmentedPrompt('cat', { maxQuota: 10, resolution: '1024' });
    expect(result).toContain('high quality');
  });

  it('appends low quality suffix for 512', () => {
    const result = buildAugmentedPrompt('cat', { maxQuota: 10, resolution: '512' });
    expect(result).toContain('low quality');
  });
});
