import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpeedDialFAB } from '../SpeedDialFAB';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockToggleSessionMode = vi.fn();
const mockToggleBlindMode = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AppModeContext', () => ({
  useAppMode: () => ({
    sessionMode: { active: false },
    blindMode: { active: false },
    toggleSessionMode: mockToggleSessionMode,
    toggleBlindMode: mockToggleBlindMode,
    setSessionActive: vi.fn(),
    setBlindActive: vi.fn(),
    clearSession: vi.fn(),
    clearBlind: vi.fn(),
  }),
}));

function renderFAB(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SpeedDialFAB />
    </MemoryRouter>,
  );
}

describe('SpeedDialFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 렌더링: FAB 버튼이 보이고 메뉴는 닫혀있음', () => {
    renderFAB();
    const fab = screen.getByRole('button', { name: '메뉴 열기' });
    expect(fab).toBeInTheDocument();
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    // 메뉴 아이템은 pointer-events-none(닫힘 상태)
    const menuItem = screen.queryByRole('button', { name: '차 추가' });
    expect(menuItem?.closest('.pointer-events-none')).toBeTruthy();
  });

  it('FAB 클릭 시 5개 메뉴 항목이 나타남', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    expect(screen.getByRole('button', { name: '차 추가' })).toBeVisible();
    expect(screen.getByRole('button', { name: '차록 작성' })).toBeVisible();
    expect(screen.getByRole('button', { name: '찻장 추가' })).toBeVisible();
    expect(screen.getByRole('button', { name: '다회모드' })).toBeVisible();
    expect(screen.getByRole('button', { name: '블라인드모드' })).toBeVisible();
  });

  it('차 추가 클릭 → /tea/new 이동', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '차 추가' }));
    expect(mockNavigate).toHaveBeenCalledWith('/tea/new');
  });

  it('차록 작성 클릭 → /note/new 이동', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '차록 작성' }));
    expect(mockNavigate).toHaveBeenCalledWith('/note/new');
  });

  it('찻장 추가 클릭 → /cellar/new 이동', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '찻장 추가' }));
    expect(mockNavigate).toHaveBeenCalledWith('/cellar/new');
  });

  it('다회모드 클릭 → toggleSessionMode 호출', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '다회모드' }));
    expect(mockToggleSessionMode).toHaveBeenCalledOnce();
  });

  it('블라인드모드 클릭 → toggleBlindMode 호출', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '블라인드모드' }));
    expect(mockToggleBlindMode).toHaveBeenCalledOnce();
  });

  it('오버레이 클릭 시 메뉴 닫힘', () => {
    renderFAB();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
    // 오버레이 클릭
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(screen.getByRole('button', { name: '메뉴 열기' })).toBeInTheDocument();
  });

  it('숨김 라우트(/blind/1)에서 FAB 미렌더링', () => {
    renderFAB('/blind/1');
    expect(screen.queryByRole('button', { name: '메뉴 열기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '메뉴 닫기' })).not.toBeInTheDocument();
  });
});
