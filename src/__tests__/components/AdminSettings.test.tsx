import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminSettings from '@/components/admin/AdminSettings';

function renderAdminSettings(overrides = {}) {
  const props = {
    config: { maxQuota: 10, resolution: '1024' as const },
    onSettingChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<AdminSettings {...props} />), props };
}

describe('AdminSettings', () => {
  it('renders the settings panel heading', () => {
    renderAdminSettings();
    expect(screen.getByText(/전체 학생 공통 설정/)).toBeInTheDocument();
  });

  it('renders quota select with current value', () => {
    renderAdminSettings();
    expect(screen.getByDisplayValue('10번')).toBeInTheDocument();
  });

  it('renders resolution select with 1024 value', () => {
    renderAdminSettings();
    expect(screen.getByDisplayValue('고화질 (1k)')).toBeInTheDocument();
  });

  it('renders resolution select with 512 value', () => {
    renderAdminSettings({ config: { maxQuota: 5, resolution: '512' as const } });
    expect(screen.getByDisplayValue('저화질 (0.5k)')).toBeInTheDocument();
  });

  it('calls onSettingChange with maxQuota and numeric value on quota change', () => {
    const { props } = renderAdminSettings();
    fireEvent.change(screen.getByDisplayValue('10번'), { target: { value: '5' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('maxQuota', 5);
  });

  it('calls onSettingChange with resolution and string value on resolution change', () => {
    const { props } = renderAdminSettings();
    fireEvent.change(screen.getByDisplayValue('고화질 (1k)'), { target: { value: '512' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('resolution', '512');
  });

  it('renders all quota options', () => {
    renderAdminSettings();
    expect(screen.getByRole('option', { name: '1번' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '5번' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '10번' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '20번' })).toBeInTheDocument();
  });
});
