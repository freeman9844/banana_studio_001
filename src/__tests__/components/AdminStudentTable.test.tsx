import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminStudentTable from '@/components/admin/AdminStudentTable';

const config = { maxQuota: 20, resolution: '1024' as const };
const quotas = [
  { nickname: 'alice', usage: 5, remaining: 15 },
  { nickname: 'bob', usage: 18, remaining: 2 },
];

function renderTable(overrides = {}) {
  const props = {
    quotas,
    config,
    isLoading: false,
    onReset: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return { ...render(<AdminStudentTable {...props} />), props };
}

describe('AdminStudentTable', () => {
  it('renders student names', () => {
    renderTable();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows loading message when isLoading is true and quotas are empty', () => {
    render(
      <AdminStudentTable quotas={[]} config={config} isLoading={true} onReset={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText(/데이터를 불러오는 중/)).toBeInTheDocument();
  });

  it('shows empty state message when no quotas and not loading', () => {
    render(
      <AdminStudentTable quotas={[]} config={config} isLoading={false} onReset={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText(/아직 마법을 사용한 학생이 없습니다/)).toBeInTheDocument();
  });

  it('calls onReset with ADD when 5번 충전 is clicked', () => {
    const { props } = renderTable();
    fireEvent.click(screen.getAllByText(/5번 충전/)[0]);
    expect(props.onReset).toHaveBeenCalledWith('alice', 5, 'ADD');
  });

  it('calls onReset with RESET when 가득 충전 is clicked', () => {
    const { props } = renderTable();
    fireEvent.click(screen.getAllByText(/가득 충전/)[0]);
    expect(props.onReset).toHaveBeenCalledWith('alice', 20, 'RESET');
  });

  it('calls onDelete when 삭제 is clicked', () => {
    const { props } = renderTable();
    fireEvent.click(screen.getAllByText(/삭제/)[0]);
    expect(props.onDelete).toHaveBeenCalledWith('alice');
  });

  it('renders remaining quota badges', () => {
    renderTable();
    expect(screen.getByText('15번')).toBeInTheDocument();
    expect(screen.getByText('2번')).toBeInTheDocument();
  });

  it('applies red badge style when remaining <= 5', () => {
    renderTable();
    const lowBadge = screen.getByText('2번');
    expect(lowBadge.className).toContain('bg-red-100');
    expect(lowBadge.className).toContain('text-red-700');
  });

  it('applies green badge style when remaining > 5', () => {
    renderTable();
    const highBadge = screen.getByText('15번');
    expect(highBadge.className).toContain('bg-green-100');
    expect(highBadge.className).toContain('text-green-700');
  });

  it('shows table headers', () => {
    renderTable();
    expect(screen.getByText('학생 이름 (별명)')).toBeInTheDocument();
    expect(screen.getByText('남은 횟수')).toBeInTheDocument();
  });
});
