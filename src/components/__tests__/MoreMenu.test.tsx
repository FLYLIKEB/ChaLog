import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MoreMenu } from '../MoreMenu';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, name: 'test' },
    isLoading: false,
  }),
}));

function renderMoreMenu(open = true) {
  const onOpenChange = vi.fn();
  return {
    onOpenChange,
    ...render(
      <MemoryRouter>
        <MoreMenu open={open} onOpenChange={onOpenChange} />
      </MemoryRouter>,
    ),
  };
}

describe('MoreMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('모든 메뉴 항목이 표시된다', () => {
    renderMoreMenu();
    expect(screen.getByText('탐색')).toBeInTheDocument();
    expect(screen.getByText('알림')).toBeInTheDocument();
    expect(screen.getByText('저장함')).toBeInTheDocument();
    expect(screen.getByText('차록 캘린더')).toBeInTheDocument();
    expect(screen.getByText('시음 세션')).toBeInTheDocument();
    expect(screen.getByText('블라인드 테이스팅')).toBeInTheDocument();
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  it('캘린더 클릭 시 /calendar로 이동한다', () => {
    const { onOpenChange } = renderMoreMenu();
    fireEvent.click(screen.getByText('차록 캘린더'));
    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('탐색 클릭 시 /sasaek으로 이동한다', () => {
    renderMoreMenu();
    fireEvent.click(screen.getByText('탐색'));
    expect(mockNavigate).toHaveBeenCalledWith('/sasaek');
  });
});
