import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockGet }),
}));

describe('isAdminAuthenticated', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns true when admin_session cookie is "true"', async () => {
    mockGet.mockImplementation((name: string) =>
      name === 'admin_session' ? { value: 'true' } : undefined
    );
    const { isAdminAuthenticated } = await import('@/lib/adminAuth');
    expect(await isAdminAuthenticated()).toBe(true);
  });

  it('returns false when admin_session cookie is absent', async () => {
    mockGet.mockReturnValue(undefined);
    const { isAdminAuthenticated } = await import('@/lib/adminAuth');
    expect(await isAdminAuthenticated()).toBe(false);
  });

  it('returns false when admin_session cookie value is not "true"', async () => {
    mockGet.mockReturnValue({ value: 'false' });
    const { isAdminAuthenticated } = await import('@/lib/adminAuth');
    expect(await isAdminAuthenticated()).toBe(false);
  });
});
