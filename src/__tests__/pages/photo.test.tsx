import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastContext';

const mockUseUser = vi.fn();
vi.mock('@/hooks/useUser', () => ({ useUser: () => mockUseUser() }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/components/PhotoStudio', () => ({
  default: () => <div data-testid="photo-studio">PhotoStudio</div>,
}));
vi.mock('@/components/Login', () => ({
  default: ({ onLogin }: { onLogin: (n: string, p: string) => void }) => (
    <button onClick={() => onLogin('nick', '1234')}>LoginBtn</button>
  ),
}));

import PhotoPage from '@/app/photo/page';

function renderPage() {
  return render(
    <ToastProvider>
      <PhotoPage />
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

describe('PhotoPage', () => {
  it('shows loading state when not yet mounted', () => {
    mockUseUser.mockReturnValue(makeUserState({ isMounted: false }));
    renderPage();
    expect(screen.getByText(/마법을 준비하는 중/)).toBeInTheDocument();
  });

  it('shows Login component when not logged in', () => {
    mockUseUser.mockReturnValue(makeUserState({ user: null }));
    renderPage();
    expect(screen.getByText('LoginBtn')).toBeInTheDocument();
  });

  it('shows back-to-home link when not logged in', () => {
    mockUseUser.mockReturnValue(makeUserState({ user: null }));
    renderPage();
    expect(screen.getByText(/기본 스튜디오로 돌아가기/)).toBeInTheDocument();
  });

  it('shows PhotoStudio when logged in', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 5 })
    );
    renderPage();
    expect(screen.getByTestId('photo-studio')).toBeInTheDocument();
  });

  it('displays nickname when logged in', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 5 })
    );
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('shows logout button when logged in', () => {
    mockUseUser.mockReturnValue(
      makeUserState({ user: { nickname: 'alice', pin: 'hash' }, currentQuota: 5 })
    );
    renderPage();
    expect(screen.getByText('(로그아웃)')).toBeInTheDocument();
  });
});
