import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from '@/components/ui/ConfirmModal';

function TestTrigger({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button onClick={() => confirm('정말 삭제할까요?').then(onResult)}>
      Open
    </button>
  );
}

function renderWithProvider(onResult = vi.fn()) {
  return render(
    <ConfirmProvider>
      <TestTrigger onResult={onResult} />
    </ConfirmProvider>
  );
}

describe('ConfirmModal', () => {
  it('does not show dialog initially', () => {
    renderWithProvider();
    expect(screen.queryByText('정말 삭제할까요?')).not.toBeInTheDocument();
  });

  it('shows dialog when confirm() is called', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('정말 삭제할까요?')).toBeInTheDocument();
  });

  it('resolves true and hides dialog when 확인 clicked', async () => {
    const onResult = vi.fn();
    renderWithProvider(onResult);
    fireEvent.click(screen.getByText('Open'));
    await act(async () => fireEvent.click(screen.getByText('확인')));
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.queryByText('정말 삭제할까요?')).not.toBeInTheDocument();
  });

  it('resolves false and hides dialog when 취소 clicked', async () => {
    const onResult = vi.fn();
    renderWithProvider(onResult);
    fireEvent.click(screen.getByText('Open'));
    await act(async () => fireEvent.click(screen.getByText('취소')));
    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByText('정말 삭제할까요?')).not.toBeInTheDocument();
  });

  it('throws when useConfirm is used outside ConfirmProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestTrigger onResult={vi.fn()} />)).toThrow(
      'useConfirm must be used within ConfirmProvider'
    );
    consoleError.mockRestore();
  });
});
