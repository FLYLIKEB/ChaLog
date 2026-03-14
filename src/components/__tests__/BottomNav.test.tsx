import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BottomNav } from '../BottomNav';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../MoreMenu', () => ({
  MoreMenu: ({ open }: { open: boolean }) =>
    open ? <div data-testid="more-menu">더보기 메뉴</div> : null,
}));

function renderBottomNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('5개 내비게이션 버튼(홈, 차담, 내 차록, 찻장, 더보기) 렌더링', () => {
    renderBottomNav();
    expect(screen.getByRole('button', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차담' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내 차록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '찻장' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
  });

  it('홈 버튼 클릭 → navigate 호출 안 함 (이미 / 에 있음)', () => {
    renderBottomNav('/');
    fireEvent.click(screen.getByRole('button', { name: '홈' }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('차담 버튼 클릭 → /chadam 으로 navigate', () => {
    renderBottomNav('/');
    fireEvent.click(screen.getByRole('button', { name: '차담' }));
    expect(mockNavigate).toHaveBeenCalledWith('/chadam');
  });

  it('내 차록 버튼 클릭 → /my-notes 로 navigate', () => {
    renderBottomNav('/');
    fireEvent.click(screen.getByRole('button', { name: '내 차록' }));
    expect(mockNavigate).toHaveBeenCalledWith('/my-notes');
  });

  it('찻장 버튼 클릭 → /cellar 로 navigate', () => {
    renderBottomNav('/');
    fireEvent.click(screen.getByRole('button', { name: '찻장' }));
    expect(mockNavigate).toHaveBeenCalledWith('/cellar');
  });

  it('더보기 버튼 클릭 → MoreMenu 열림', () => {
    renderBottomNav('/');
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByTestId('more-menu')).toBeInTheDocument();
  });

  it('/chadam 경로에서 차담 버튼이 활성 색상', () => {
    renderBottomNav('/chadam');
    const btn = screen.getByRole('button', { name: '차담' });
    expect(btn.className).toContain('text-primary');
  });

  it('/my-notes 경로에서 내 차록 버튼이 활성', () => {
    renderBottomNav('/my-notes');
    const btn = screen.getByRole('button', { name: '내 차록' });
    expect(btn.className).toContain('text-primary');
  });
});
