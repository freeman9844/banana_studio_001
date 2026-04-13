import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastContext';

const mockUseUser = vi.fn();
vi.mock('@/hooks/useUser', () => ({ useUser: () => mockUseUser() }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/components/Studio', () => ({
  default: ({ onGenerate }: { onGenerate: () => void }) => (
    <div data-testid="studio" onClick={onGenerate}>Studio</div>
  ),
}));
vi.mock('@/components/Login', () => ({
  default: ({ onLogin }: { onLogin: (n: string, p: string) => void }) => (
    <button onClick={() => onLogin('alice', '1234')}>LoginBtn</button>
  ),
}));

import Home from '@/app/page';

function renderHome() {
  return render(
    <ToastProvider>
      <Home />
    </ToastProvider>
  );
}

function makeUserState(overrides = {}) {
  return {
    user: null,
    currentQuota: 0,
    isMounted: true,
    handleLogin: vi.fn(),
    handleLogout: vi.fn(),
    ...overrides,
  };
}

describe('Home page', () => {
  it('shows loading state when not mounted', () => {
    mockUseUser.mockReturnValue(makeUserState({ isMounted: false }));
    renderHome();
    expect(screen.getByText(/마법을 준비하는 중/)).toBeInTheDocument();
  });

  it('shows Login when user is null', () => {
    mockUseUser.mockReturnValue(makeUserState());
    renderHome();
    expect(screen.getByText('LoginBtn')).toBeInTheDocument();
  });

  it('shows Studio when user is logged in', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 10 })
    );
    renderHome();
    expect(screen.getByTestId('studio')).toBeInTheDocument();
  });

  it('shows welcome message with nickname', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'bob', pin: 'hash' }, currentQuota: 5 })
    );
    renderHome();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText(/환영합니다/)).toBeInTheDocument();
  });

  it('shows logout button when logged in', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 5 })
    );
    renderHome();
    expect(screen.getByText('(로그아웃)')).toBeInTheDocument();
  });

  it('calls handleLogout when logout button clicked', () => {
    const handleLogout = vi.fn();
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 5, handleLogout })
    );
    renderHome();
    fireEvent.click(screen.getByText('(로그아웃)'));
    expect(handleLogout).toHaveBeenCalledOnce();
  });

  it('shows photo studio link when logged in', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 5 })
    );
    renderHome();
    expect(screen.getByText(/마법 사진관으로 가기/)).toBeInTheDocument();
  });

  it('shows error toast when login throws', async () => {
    const handleLogin = vi.fn().mockRejectedValue(new Error('잘못된 PIN'));
    mockUseUser.mockReturnValue(makeUserState({ handleLogin }));
    renderHome();
    fireEvent.click(screen.getByText('LoginBtn'));
    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith('alice', '1234');
    });
  });
});
