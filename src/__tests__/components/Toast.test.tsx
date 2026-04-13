import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseToast = vi.fn();
vi.mock('@/components/ui/ToastContext', () => ({
  useToast: () => mockUseToast(),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Toast } from '@/components/ui/Toast';

function defaultToastCtx(overrides = {}) {
  return { toasts: [], showToast: vi.fn(), removeToast: vi.fn(), ...overrides };
}

describe('Toast component', () => {
  it('renders nothing when there are no toasts', () => {
    mockUseToast.mockReturnValue(defaultToastCtx());
    const { container } = render(<Toast />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a success toast message', () => {
    mockUseToast.mockReturnValue(
      defaultToastCtx({ toasts: [{ id: '1', message: 'Saved!', type: 'success' }] })
    );
    render(<Toast />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('applies red background for error toast', () => {
    mockUseToast.mockReturnValue(
      defaultToastCtx({ toasts: [{ id: '1', message: 'Failed!', type: 'error' }] })
    );
    render(<Toast />);
    const toastEl = screen.getByText('Failed!').closest('div[class*="bg-"]');
    expect(toastEl?.className).toContain('bg-red-500');
  });

  it('applies green background for success toast', () => {
    mockUseToast.mockReturnValue(
      defaultToastCtx({ toasts: [{ id: '1', message: 'Done!', type: 'success' }] })
    );
    render(<Toast />);
    const toastEl = screen.getByText('Done!').closest('div[class*="bg-"]');
    expect(toastEl?.className).toContain('bg-green-500');
  });

  it('applies blue background for info toast', () => {
    mockUseToast.mockReturnValue(
      defaultToastCtx({ toasts: [{ id: '1', message: 'Info!', type: 'info' }] })
    );
    render(<Toast />);
    const toastEl = screen.getByText('Info!').closest('div[class*="bg-"]');
    expect(toastEl?.className).toContain('bg-blue-500');
  });

  it('calls removeToast with the toast id when close button is clicked', () => {
    const removeToast = vi.fn();
    mockUseToast.mockReturnValue(
      defaultToastCtx({ toasts: [{ id: 'toast-42', message: 'Msg', type: 'info' }], removeToast })
    );
    render(<Toast />);
    fireEvent.click(screen.getByText('✕'));
    expect(removeToast).toHaveBeenCalledWith('toast-42');
  });

  it('renders multiple toasts', () => {
    mockUseToast.mockReturnValue(
      defaultToastCtx({
        toasts: [
          { id: '1', message: 'First', type: 'success' },
          { id: '2', message: 'Second', type: 'error' },
        ],
      })
    );
    render(<Toast />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
