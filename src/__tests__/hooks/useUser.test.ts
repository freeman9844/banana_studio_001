import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUser } from '@/hooks/useUser';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

vi.mock('swr', () => ({
  default: vi.fn().mockReturnValue({ data: { remainingQuota: 15 }, mutate: vi.fn() }),
}));

describe('useUser', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('restores user from localStorage on mount', async () => {
    localStorageMock.setItem('banana_studio_user', JSON.stringify({ nickname: 'alice', pin: '1234' }));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    expect(result.current.user?.nickname).toBe('alice');
  });

  it('starts with null user when localStorage is empty', async () => {
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    expect(result.current.user).toBeNull();
  });

  it('handleLogout clears user and localStorage', async () => {
    localStorageMock.setItem('banana_studio_user', JSON.stringify({ nickname: 'alice', pin: '1234' }));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.user).not.toBeNull());
    act(() => result.current.handleLogout());
    expect(result.current.user).toBeNull();
    expect(localStorageMock.getItem('banana_studio_user')).toBeNull();
  });

  it('handleLogin saves user on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    await act(async () => { await result.current.handleLogin('bob', '5678'); });
    expect(result.current.user?.nickname).toBe('bob');
    expect(localStorageMock.getItem('banana_studio_user')).toContain('bob');
  });

  it('handleLogin throws on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: '잘못된 PIN' }) });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    await expect(
      act(async () => { await result.current.handleLogin('bob', 'wrong'); })
    ).rejects.toThrow('잘못된 PIN');
  });

  it('returns currentQuota from swr data', async () => {
    localStorageMock.setItem('banana_studio_user', JSON.stringify({ nickname: 'alice', pin: '1234' }));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.isMounted).toBe(true));
    expect(result.current.currentQuota).toBe(15);
  });
});
