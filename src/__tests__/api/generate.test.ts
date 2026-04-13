import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiService', () => ({
  generateImageWithRetry: vi.fn(),
}));
vi.mock('@/lib/generateHelpers', () => ({
  handleGenerateRequest: vi.fn(),
  buildAugmentedPrompt: vi.fn().mockReturnValue('augmented prompt'),
}));

import { POST } from '@/app/api/generate/route';
import { handleGenerateRequest } from '@/lib/generateHelpers';

const mockHandle = vi.mocked(handleGenerateRequest);

function makeRequest(body: object) {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when prompt is missing', async () => {
    const res = await POST(makeRequest({ user: { nickname: 'alice', pin: '1234' } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing');
  });

  it('returns 400 when user is missing', async () => {
    const res = await POST(makeRequest({ prompt: 'cat' }));
    expect(res.status).toBe(400);
  });

  it('delegates to handleGenerateRequest on valid input', async () => {
    mockHandle.mockResolvedValue(
      new Response(JSON.stringify({ imageUrl: 'https://img.url', remainingQuota: 5 }), { status: 200 })
    );
    const res = await POST(makeRequest({ prompt: 'cat', user: { nickname: 'alice', pin: '1234' } }));
    expect(res.status).toBe(200);
    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('returns 500 on JSON parse error', async () => {
    const badRequest = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: 'invalid json',
    });
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });
});
