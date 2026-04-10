import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '@/components/Login';

describe('Login component', () => {
  it('renders nickname and pin inputs', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('나의 멋진 별명')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호 4자리 (숫자)')).toBeInTheDocument();
  });

  it('calls onLogin with trimmed nickname and pin', () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('나의 멋진 별명'), { target: { value: ' alice ' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 4자리 (숫자)'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('시작하기! 🚀'));
    expect(onLogin).toHaveBeenCalledWith('alice', '1234');
  });

  it('does not call onLogin with short pin', () => {
    const onLogin = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('나의 멋진 별명'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('비밀번호 4자리 (숫자)'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('시작하기! 🚀'));
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('does not call onLogin with empty nickname', () => {
    const onLogin = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('비밀번호 4자리 (숫자)'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('시작하기! 🚀'));
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('renders submit button', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByText('시작하기! 🚀')).toBeInTheDocument();
  });
});
