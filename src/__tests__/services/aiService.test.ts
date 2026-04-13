import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function makeResponse(base64 = 'abc123', mimeType = 'image/png') {
  return {
    candidates: [{ content: { parts: [{ inlineData: { data: base64, mimeType } }] } }],
  };
}

describe('generateImageWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  it('throws when GOOGLE_CLOUD_PROJECT is not set', async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    const { generateImageWithRetry } = await import('@/services/aiService');
    await expect(generateImageWithRetry('prompt')).rejects.toThrow('GOOGLE_CLOUD_PROJECT');
  });

  it('returns image data on success', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse());
    const { generateImageWithRetry } = await import('@/services/aiService');
    const result = await generateImageWithRetry('prompt');
    expect(result.base64).toBe('abc123');
    expect(result.mimeType).toBe('image/png');
  });

  it('throws when candidates array is empty', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [] });
    const { generateImageWithRetry } = await import('@/services/aiService');
    await expect(generateImageWithRetry('prompt')).rejects.toThrow('No candidates');
  });

  it('throws when no image data in response parts', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'hello' }] } }],
    });
    const { generateImageWithRetry } = await import('@/services/aiService');
    await expect(generateImageWithRetry('prompt')).rejects.toThrow('No image data');
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    vi.useFakeTimers();
    mockGenerateContent
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce(makeResponse());

    const { generateImageWithRetry } = await import('@/services/aiService');
    const promise = generateImageWithRetry('prompt', 1);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.base64).toBe('abc123');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws non-429 errors immediately without retry', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Server error'));
    const { generateImageWithRetry } = await import('@/services/aiService');
    await expect(generateImageWithRetry('prompt')).rejects.toThrow('Server error');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});

describe('generateMultimodalWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  it('throws when GOOGLE_CLOUD_PROJECT is not set', async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    const { generateMultimodalWithRetry } = await import('@/services/aiService');
    await expect(generateMultimodalWithRetry('prompt', 'b64', 'image/jpeg')).rejects.toThrow('GOOGLE_CLOUD_PROJECT');
  });

  it('returns image data on success', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse('xyz', 'image/jpeg'));
    const { generateMultimodalWithRetry } = await import('@/services/aiService');
    const result = await generateMultimodalWithRetry('prompt', 'b64data', 'image/jpeg');
    expect(result.base64).toBe('xyz');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    vi.useFakeTimers();
    mockGenerateContent
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce(makeResponse('xyz', 'image/jpeg'));

    const { generateMultimodalWithRetry } = await import('@/services/aiService');
    const promise = generateMultimodalWithRetry('prompt', 'b64', 'image/jpeg', 1);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.base64).toBe('xyz');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws non-429 errors immediately', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Bad request'));
    const { generateMultimodalWithRetry } = await import('@/services/aiService');
    await expect(generateMultimodalWithRetry('prompt', 'b64', 'image/jpeg')).rejects.toThrow('Bad request');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
