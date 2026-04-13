import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Studio from '@/components/Studio';
import { ToastProvider } from '@/components/ui/ToastContext';

function renderStudio(props: { initialQuota?: number; onGenerate?: () => Promise<{ imageUrl: string; remainingQuota: number }> } = {}) {
  const onGenerate = props.onGenerate ?? vi.fn();
  return render(
    <ToastProvider>
      <Studio onGenerate={onGenerate} initialQuota={props.initialQuota} />
    </ToastProvider>
  );
}

describe('Studio component', () => {
  it('renders remaining quota', () => {
    renderStudio({ initialQuota: 7 });
    expect(screen.getByText('🪄 남은 마법: 7번')).toBeInTheDocument();
  });

  it('disables button when quota is 0', () => {
    renderStudio({ initialQuota: 0 });
    const button = screen.getByRole('button', { name: /오늘의 마법을 다 썼어요/ });
    expect(button).toBeDisabled();
  });

  it('shows red badge when quota <= 5', () => {
    renderStudio({ initialQuota: 3 });
    const badge = screen.getByText('🪄 남은 마법: 3번');
    expect(badge.className).toContain('bg-red-100');
  });

  it('shows green badge when quota > 5', () => {
    renderStudio({ initialQuota: 10 });
    const badge = screen.getByText('🪄 남은 마법: 10번');
    expect(badge.className).toContain('bg-green-100');
  });

  it('shows generate button text when quota > 0', () => {
    renderStudio({ initialQuota: 5 });
    expect(screen.getByRole('button', { name: /그림 만들기/ })).toBeInTheDocument();
  });

  it('shows quota exactly at boundary (5) as red badge', () => {
    renderStudio({ initialQuota: 5 });
    const badge = screen.getByText('🪄 남은 마법: 5번');
    expect(badge.className).toContain('bg-red-100');
  });

  it('shows quota exactly at boundary (6) as green badge', () => {
    renderStudio({ initialQuota: 6 });
    const badge = screen.getByText('🪄 남은 마법: 6번');
    expect(badge.className).toContain('bg-green-100');
  });

  it('shows loading state during generation', async () => {
    let resolve: (v: { imageUrl: string; remainingQuota: number }) => void;
    const onGenerate = vi.fn(
      () => new Promise<{ imageUrl: string; remainingQuota: number }>((r) => { resolve = r; })
    );
    renderStudio({ initialQuota: 5, onGenerate });

    fireEvent.change(screen.getByPlaceholderText(/우주에서/), { target: { value: 'cat' } });
    fireEvent.click(screen.getByRole('button', { name: /그림 만들기/ }));

    await waitFor(() => expect(screen.getByText(/마법의 물감을 섞고 있어요/)).toBeInTheDocument());

    await act(async () => { resolve({ imageUrl: 'https://img.url/img.png', remainingQuota: 4 }); });
  });

  it('shows generated image after successful generation', async () => {
    const onGenerate = vi.fn().mockResolvedValue({ imageUrl: 'https://img.url/img.png', remainingQuota: 4 });
    renderStudio({ initialQuota: 5, onGenerate });

    fireEvent.change(screen.getByPlaceholderText(/우주에서/), { target: { value: 'cat' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /그림 만들기/ })); });

    await waitFor(() => expect(screen.getByAltText('생성된 그림')).toBeInTheDocument());
    expect(screen.getByText('🪄 남은 마법: 4번')).toBeInTheDocument();
  });

  it('shows error toast when generation fails', async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error('AI error'));
    renderStudio({ initialQuota: 5, onGenerate });

    fireEvent.change(screen.getByPlaceholderText(/우주에서/), { target: { value: 'cat' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /그림 만들기/ })); });

    await waitFor(() => expect(onGenerate).toHaveBeenCalledOnce());
  });

  it('updates quota when initialQuota prop changes', () => {
    const { rerender } = renderStudio({ initialQuota: 10 });
    expect(screen.getByText('🪄 남은 마법: 10번')).toBeInTheDocument();
    rerender(
      <ToastProvider>
        <Studio onGenerate={vi.fn()} initialQuota={3} />
      </ToastProvider>
    );
    expect(screen.getByText('🪄 남은 마법: 3번')).toBeInTheDocument();
  });
});
