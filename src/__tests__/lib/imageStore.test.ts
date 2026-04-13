import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockGetSignedUrl = vi.fn();
const mockFileFn = vi.fn().mockReturnValue({ save: mockSave, getSignedUrl: mockGetSignedUrl });
const mockBucketFn = vi.fn().mockReturnValue({ file: mockFileFn });

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({ bucket: mockBucketFn })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('saveImageToGcs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFileFn.mockReturnValue({ save: mockSave, getSignedUrl: mockGetSignedUrl });
    mockBucketFn.mockReturnValue({ file: mockFileFn });
    delete process.env.GCS_BUCKET_NAME;
  });

  it('returns data URL when GCS_BUCKET_NAME is not set', async () => {
    const { saveImageToGcs } = await import('@/lib/imageStore');
    const result = await saveImageToGcs('base64data', 'image/png', 'alice');
    expect(result).toBe('data:image/png;base64,base64data');
  });

  it('saves to GCS and returns signed URL on success', async () => {
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    mockSave.mockResolvedValue(undefined);
    mockGetSignedUrl.mockResolvedValue(['https://signed.url/image.png']);

    const { saveImageToGcs } = await import('@/lib/imageStore');
    const result = await saveImageToGcs('base64data', 'image/png', 'alice');
    expect(result).toBe('https://signed.url/image.png');
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it('falls back to data URL on GCS save error', async () => {
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    mockSave.mockRejectedValue(new Error('GCS network error'));

    const { saveImageToGcs } = await import('@/lib/imageStore');
    const result = await saveImageToGcs('base64data', 'image/jpeg', 'alice');
    expect(result).toBe('data:image/jpeg;base64,base64data');
  });

  it('uses correct extension and nickname in GCS path', async () => {
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    mockSave.mockResolvedValue(undefined);
    mockGetSignedUrl.mockResolvedValue(['https://signed.url/image.jpeg']);

    const { saveImageToGcs } = await import('@/lib/imageStore');
    await saveImageToGcs('base64data', 'image/jpeg', 'bob');

    const fileName = mockFileFn.mock.calls[0][0] as string;
    expect(fileName).toContain('images/bob/');
    expect(fileName).toContain('.jpeg');
  });
});
