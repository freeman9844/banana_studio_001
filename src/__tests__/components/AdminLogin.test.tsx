import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminLogin from '@/components/admin/AdminLogin';

function renderAdminLogin(overrides = {}) {
  const props = {
    onLogin: vi.fn((e: React.FormEvent) => e.preventDefault()),
    adminId: '',
    adminPassword: '',
    onAdminIdChange: vi.fn(),
    onAdminPasswordChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<AdminLogin {...props} />), props };
}

describe('AdminLogin', () => {
  it('renders id and password inputs', () => {
    renderAdminLogin();
    expect(screen.getByPlaceholderText('아이디')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderAdminLogin();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('displays the current adminId value', () => {
    renderAdminLogin({ adminId: 'teacher' });
    expect(screen.getByPlaceholderText('아이디')).toHaveValue('teacher');
  });

  it('displays the current adminPassword value', () => {
    renderAdminLogin({ adminPassword: 'secret' });
    expect(screen.getByPlaceholderText('비밀번호')).toHaveValue('secret');
  });

  it('calls onAdminIdChange when id input changes', () => {
    const { props } = renderAdminLogin();
    fireEvent.change(screen.getByPlaceholderText('아이디'), { target: { value: 'admin' } });
    expect(props.onAdminIdChange).toHaveBeenCalledWith('admin');
  });

  it('calls onAdminPasswordChange when password input changes', () => {
    const { props } = renderAdminLogin();
    fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'pw123' } });
    expect(props.onAdminPasswordChange).toHaveBeenCalledWith('pw123');
  });

  it('calls onLogin when form is submitted', () => {
    const { props } = renderAdminLogin({ adminId: 'admin', adminPassword: 'pw' });
    fireEvent.submit(screen.getByRole('button', { name: '로그인' }).closest('form')!);
    expect(props.onLogin).toHaveBeenCalledOnce();
  });
});
