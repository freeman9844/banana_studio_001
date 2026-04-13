import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PhotoStudio from '@/components/PhotoStudio';
import { ToastProvider } from '@/components/ui/ToastContext';

// Helper to simulate file upload + FileReader base64 extraction
async function uploadFile(fileInput: HTMLElement, base64Result = 'data:image/png;base64,abc123') {
  const mockReaderInstance = {
    readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
      this.result = base64Result;
      this.onloadend?.();
    }),
    onloadend: null as (() => void) | null,
    result: null as string | null,
  };
  vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => mockReaderInstance));
  vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:test-url') });

  const file = new File(['img'], 'photo.png', { type: 'image/png' });
  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });
}

function renderPhotoStudio(overrides = {}) {
  const props = {
    onGenerate: vi.fn(),
    initialQuota: 10,
    ...overrides,
  };
  return {
    ...render(
      <ToastProvider>
        <PhotoStudio {...props} />
      </ToastProvider>
    ),
    props,
  };
}

describe('PhotoStudio', () => {
  it('renders remaining quota badge', () => {
    renderPhotoStudio({ initialQuota: 10 });
    expect(screen.getByText('🪄 남은 마법: 10번')).toBeInTheDocument();
  });

  it('shows green badge when quota > 5', () => {
    renderPhotoStudio({ initialQuota: 8 });
    expect(screen.getByText('🪄 남은 마법: 8번').className).toContain('bg-green-100');
  });

  it('shows red badge when quota <= 5', () => {
    renderPhotoStudio({ initialQuota: 4 });
    expect(screen.getByText('🪄 남은 마법: 4번').className).toContain('bg-red-100');
  });

  it('shows exhausted button text when quota is 0', () => {
    renderPhotoStudio({ initialQuota: 0 });
    expect(screen.getByRole('button', { name: /오늘의 마법을 다 썼어요/ })).toBeDisabled();
  });

  it('renders prompt textarea', () => {
    renderPhotoStudio();
    expect(screen.getByPlaceholderText(/사진 속 친구가/)).toBeInTheDocument();
  });

  it('disables textarea when quota is 0', () => {
    renderPhotoStudio({ initialQuota: 0 });
    expect(screen.getByPlaceholderText(/사진 속 친구가/)).toBeDisabled();
  });

  it('renders upload area with instruction text', () => {
    renderPhotoStudio();
    expect(screen.getByText(/여기를 눌러서/)).toBeInTheDocument();
  });

  it('shows file preview after file upload', async () => {
    renderPhotoStudio({ initialQuota: 5 });
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await uploadFile(fileInput);
    await waitFor(() => expect(screen.getByAltText('업로드된 사진')).toBeInTheDocument());
  });

  it('shows 사진 바꾸기 button after file upload', async () => {
    renderPhotoStudio({ initialQuota: 5 });
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await uploadFile(fileInput);
    await waitFor(() => expect(screen.getByText(/사진 바꾸기/)).toBeInTheDocument());
  });

  it('calls onGenerate after file upload and prompt entry', async () => {
    const { props } = renderPhotoStudio({ initialQuota: 5 });
    props.onGenerate.mockResolvedValue({ imageUrl: 'https://img.url/img.png', remainingQuota: 4 });

    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await uploadFile(fileInput);

    fireEvent.change(screen.getByPlaceholderText(/사진 속 친구가/), { target: { value: '우주 고양이' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /사진으로 그림 만들기/ })); });

    await waitFor(() => expect(props.onGenerate).toHaveBeenCalledOnce());
  });

  it('shows generated image after successful generation', async () => {
    const { props } = renderPhotoStudio({ initialQuota: 5 });
    props.onGenerate.mockResolvedValue({ imageUrl: 'https://img.url/img.png', remainingQuota: 4 });

    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await uploadFile(fileInput);

    fireEvent.change(screen.getByPlaceholderText(/사진 속 친구가/), { target: { value: '우주 고양이' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /사진으로 그림 만들기/ })); });

    await waitFor(() => expect(screen.getByAltText('생성된 그림')).toBeInTheDocument());
    expect(screen.getByText('🪄 남은 마법: 4번')).toBeInTheDocument();
  });

  it('clears preview when 사진 바꾸기 is clicked', async () => {
    renderPhotoStudio({ initialQuota: 5 });
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await uploadFile(fileInput);

    await waitFor(() => expect(screen.getByText(/사진 바꾸기/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/사진 바꾸기/));
    await waitFor(() => expect(screen.queryByAltText('업로드된 사진')).not.toBeInTheDocument());
  });

  it('updates quota when initialQuota prop changes', () => {
    const { rerender } = renderPhotoStudio({ initialQuota: 10 });
    expect(screen.getByText('🪄 남은 마법: 10번')).toBeInTheDocument();

    rerender(
      <ToastProvider>
        <PhotoStudio onGenerate={vi.fn()} initialQuota={7} />
      </ToastProvider>
    );
    expect(screen.getByText('🪄 남은 마법: 7번')).toBeInTheDocument();
  });
});
