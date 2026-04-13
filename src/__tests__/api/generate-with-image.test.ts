import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiService', () => ({
  generateMultimodalWithRetry: vi.fn(),
}));
vi.mock('@/lib/generateHelpers', () => ({
  handleGenerateRequest: vi.fn(),
  buildAugmentedPrompt: vi.fn().mockReturnValue('augmented prompt'),
}));

import { POST } from '@/app/api/generate-with-image/route';
import { handleGenerateRequest } from '@/lib/generateHelpers';

const mockHandle = vi.mocked(handleGenerateRequest);

function makeRequest(body: object) {
  return new Request('http://localhost/api/generate-with-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  prompt: 'cat in space',
  user: { nickname: 'alice', pin: '1234' },
  referenceImageBase64: 'base64imagedata',
  referenceMimeType: 'image/jpeg',
};

describe('POST /api/generate-with-image', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when prompt is missing', async () => {
    const { prompt: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing');
  });

  it('returns 400 when user is missing', async () => {
    const { user: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it('returns 400 when referenceImageBase64 is missing', async () => {
    const { referenceImageBase64: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it('delegates to handleGenerateRequest on valid input', async () => {
    mockHandle.mockResolvedValue(
      new Response(JSON.stringify({ imageUrl: 'https://img.url', remainingQuota: 3 }), { status: 200 })
    );
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('returns 500 on JSON parse error', async () => {
    const badRequest = new Request('http://localhost/api/generate-with-image', {
      method: 'POST',
      body: 'invalid json',
    });
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });
});
