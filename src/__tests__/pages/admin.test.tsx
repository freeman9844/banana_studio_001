import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastContext';
import { ConfirmProvider } from '@/components/ui/ConfirmModal';

vi.mock('@/components/admin/AdminLogin', () => ({
  default: ({ onLogin, onAdminIdChange, onAdminPasswordChange }: {
    onLogin: (e: React.FormEvent) => void;
    onAdminIdChange: (v: string) => void;
    onAdminPasswordChange: (v: string) => void;
    adminId: string;
    adminPassword: string;
  }) => (
    <form onSubmit={onLogin} data-testid="admin-login-form">
      <input placeholder="id" onChange={(e) => onAdminIdChange(e.target.value)} />
      <input placeholder="pw" onChange={(e) => onAdminPasswordChange(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  ),
}));

vi.mock('@/components/admin/AdminSettings', () => ({
  default: ({ onSettingChange }: { onSettingChange: (f: string, v: unknown) => void; config: unknown }) => (
    <div data-testid="admin-settings">
      <button onClick={() => onSettingChange('maxQuota', 5)}>Change Quota</button>
    </div>
  ),
}));

vi.mock('@/components/admin/AdminStudentTable', () => ({
  default: ({ onReset, onDelete }: {
    quotas: unknown[];
    config: unknown;
    isLoading: boolean;
    onReset: (n: string, a: number, t: string) => void;
    onDelete: (n: string) => void;
  }) => (
    <div data-testid="admin-student-table">
      <button onClick={() => onReset('alice', 5, 'ADD')}>Reset Alice</button>
      <button onClick={() => onDelete('alice')}>Delete Alice</button>
    </div>
  ),
}));

import AdminDashboard from '@/app/admin/page';

function renderAdmin() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <AdminDashboard />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function mockFetch(responses: Array<{ ok: boolean; status?: number; json?: object }>) {
  let callIndex = 0;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
    const response = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 400),
      json: () => Promise.resolve(response.json ?? {}),
    });
  }));
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows login form when not authenticated (initial 401)', async () => {
    mockFetch([{ ok: false, status: 401 }]);
    renderAdmin();
    await waitFor(() => expect(screen.getByTestId('admin-login-form')).toBeInTheDocument());
  });

  it('shows dashboard when fetchQuotas returns 200', async () => {
    mockFetch([{
      ok: true,
      status: 200,
      json: { quotas: [{ nickname: 'alice', usage: 3, remaining: 7 }], config: { maxQuota: 10, resolution: '1024' } },
    }]);
    renderAdmin();
    await waitFor(() => expect(screen.getByTestId('admin-student-table')).toBeInTheDocument());
    expect(screen.getByTestId('admin-settings')).toBeInTheDocument();
  });

  it('shows dashboard heading when authenticated', async () => {
    mockFetch([{
      ok: true,
      status: 200,
      json: { quotas: [], config: { maxQuota: 10, resolution: '1024' } },
    }]);
    renderAdmin();
    await waitFor(() => expect(screen.getByText(/선생님 관리자 화면/)).toBeInTheDocument());
  });

  it('handles login form submission and authenticates on success', async () => {
    // First fetch (initial) → 401, second fetch (login) → 200, third fetch (quotas after auth) → 200
    mockFetch([
      { ok: false, status: 401 },
      { ok: true, status: 200, json: {} },
      { ok: true, status: 200, json: { quotas: [], config: { maxQuota: 10, resolution: '1024' } } },
    ]);

    renderAdmin();
    await waitFor(() => expect(screen.getByTestId('admin-login-form')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('id'), { target: { value: 'teacher' } });
      fireEvent.change(screen.getByPlaceholderText('pw'), { target: { value: 'secret' } });
      fireEvent.click(screen.getByText('Login'));
    });

    await waitFor(() => expect(screen.getByTestId('admin-student-table')).toBeInTheDocument());
  });

  it('shows error toast on login failure', async () => {
    mockFetch([
      { ok: false, status: 401 },
      { ok: false, status: 401 },
    ]);

    renderAdmin();
    await waitFor(() => expect(screen.getByTestId('admin-login-form')).toBeInTheDocument());

    await act(async () => {
      fireEvent.submit(screen.getByTestId('admin-login-form'));
    });

    await waitFor(() => expect(screen.getByTestId('admin-login-form')).toBeInTheDocument());
  });

  it('calls setting change handler when AdminSettings triggers change', async () => {
    mockFetch([
      { ok: true, status: 200, json: { quotas: [], config: { maxQuota: 10, resolution: '1024' } } },
      { ok: true, status: 200, json: {} }, // config update
    ]);

    renderAdmin();
    await waitFor(() => expect(screen.getByTestId('admin-settings')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Change Quota'));
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/admin/config', expect.objectContaining({ method: 'POST' }));
  });

  it('calls reset endpoint when Reset Alice is clicked and confirmed', async () => {
    mockFetch([
      { ok: true, status: 200, json: { quotas: [{ nickname: 'alice', usage: 3, remaining: 7 }], config: { maxQuota: 10, resolution: '1024' } } },
      { ok: true, status: 200, json: {} }, // reset call
      { ok: true, status: 200, json: { quotas: [], config: { maxQuota: 10, resolution: '1024' } } }, // re-fetch
    ]);

    renderAdmin();
    await waitFor(() => expect(screen.getByText('Reset Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Reset Alice'));

    // Confirm dialog appears
    await waitFor(() => expect(screen.getByText('확인')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('확인')); });

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/admin/quotas/reset', expect.objectContaining({ method: 'POST' })
    ));
  });

  it('does not call reset endpoint when confirm is cancelled', async () => {
    mockFetch([
      { ok: true, status: 200, json: { quotas: [{ nickname: 'alice', usage: 3, remaining: 7 }], config: { maxQuota: 10, resolution: '1024' } } },
    ]);

    renderAdmin();
    await waitFor(() => expect(screen.getByText('Reset Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Reset Alice'));
    await waitFor(() => expect(screen.getByText('취소')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('취소')); });

    // Reset endpoint should never be called
    const allCalls = vi.mocked(fetch).mock.calls;
    const resetCalls = allCalls.filter((args) => String(args[0]).includes('/reset'));
    expect(resetCalls).toHaveLength(0);
  });

  it('calls delete endpoint when Delete Alice is clicked and confirmed', async () => {
    mockFetch([
      { ok: true, status: 200, json: { quotas: [{ nickname: 'alice', usage: 3, remaining: 7 }], config: { maxQuota: 10, resolution: '1024' } } },
      { ok: true, status: 200, json: {} },
      { ok: true, status: 200, json: { quotas: [], config: { maxQuota: 10, resolution: '1024' } } },
    ]);

    renderAdmin();
    await waitFor(() => expect(screen.getByText('Delete Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Delete Alice'));
    await waitFor(() => expect(screen.getByText(/정말로.*alice.*삭제/)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('확인')); });

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/admin/quotas/reset',
      expect.objectContaining({ body: expect.stringContaining('DELETE') })
    ));
  });
});
