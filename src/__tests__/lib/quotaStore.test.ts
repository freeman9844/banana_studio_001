import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockDownload = vi.fn();
const mockGetMetadata = vi.fn();
const mockWriteFile = vi.fn();
const mockReadFile = vi.fn();

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: mockSave,
        download: mockDownload,
        getMetadata: mockGetMetadata,
      }),
    }),
  })),
}));

vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile, writeFile: mockWriteFile },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

describe('quotaStore — GCS conditional writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  it('retries on GCS 412 conflict and succeeds on second attempt', async () => {
    const initialData = JSON.stringify({ alice: { usage: 0, pin: 'hash' } });
    mockDownload
      .mockResolvedValueOnce([Buffer.from(initialData)])
      .mockResolvedValueOnce([Buffer.from(initialData)]);
    mockGetMetadata
      .mockResolvedValueOnce([{ generation: '100' }])
      .mockResolvedValueOnce([{ generation: '101' }]);

    const conflictError = Object.assign(new Error('conditionNotMet'), { code: 412 });
    mockSave
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    const { updateQuotaSafely } = await import('@/lib/quotaStore');
    const result = await updateQuotaSafely('alice', (existing) => ({
      ...existing!,
      usage: (existing?.usage ?? 0) + 1,
    }));

    expect(result.usage).toBe(1);
    expect(mockSave).toHaveBeenCalledTimes(2);
  });
});

describe('quotaStore — config cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  it('returns cached config on second call within TTL', async () => {
    const configData = JSON.stringify({ maxQuota: 5, resolution: '512' });
    mockReadFile.mockResolvedValue(configData);

    const { getConfig } = await import('@/lib/quotaStore');
    const result1 = await getConfig();
    const result2 = await getConfig();

    expect(result1).toEqual({ maxQuota: 5, resolution: '512' });
    expect(result2).toEqual({ maxQuota: 5, resolution: '512' });
    // 두 번 호출했지만 파일 읽기는 한 번만
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache after saveConfig', async () => {
    const configData = JSON.stringify({ maxQuota: 5, resolution: '512' });
    mockReadFile.mockResolvedValue(configData);
    mockWriteFile.mockResolvedValue(undefined);
    mockSave.mockResolvedValue(undefined);

    const { getConfig, saveConfig } = await import('@/lib/quotaStore');
    await getConfig(); // 캐시 채움
    await saveConfig({ maxQuota: 10, resolution: '1024' }); // 캐시 무효화
    await getConfig(); // 재조회

    // saveConfig 후 getConfig가 파일을 다시 읽어야 함
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });
});
