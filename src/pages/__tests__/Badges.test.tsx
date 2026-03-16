import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { Badges } from '../Badges';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { usersApi } from '../../lib/api';
import { ALL_BADGES } from '../../constants/badges';

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('../../lib/api', () => ({
  usersApi: { getLevel: vi.fn() },
  authApi: { getMe: vi.fn().mockResolvedValue({ user: null }) },
  notesApi: {},
  postsApi: {},
  teasApi: {},
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockUser = {
  id: 1,
  name: '테스트 사용자',
  email: 'test@example.com',
};

const mockUserLevel = {
  noteLevel: { level: 2, name: '수련', count: 8, nextThreshold: 20 },
  postLevel: { level: 1, name: '새싹', count: 2, nextThreshold: 5 },
  cellarLevel: { level: 3, name: '수집가', count: 18, nextThreshold: 30 },
  badges: [
    { id: 'first_note', name: '첫 차록' },
    { id: 'note_10', name: '차록 10개' },
  ],
};

const mockAuthReturn = {
  user: mockUser,
  isAuthenticated: true,
  isAdmin: false,
  isLoading: false,
  token: 'mock-token',
  login: vi.fn(),
  register: vi.fn(),
  loginWithKakao: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  hasCompletedOnboarding: null,
  isOnboardingLoading: false,
  refreshOnboardingStatus: vi.fn(),
};

describe('Badges 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthReturn);
    vi.mocked(usersApi.getLevel).mockResolvedValue(mockUserLevel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('로그인하지 않은 사용자는 로그인 유도 메시지를 표시', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthReturn,
      user: null,
      isAuthenticated: false,
      token: null,
    });

    renderWithRouter(<Badges />, { route: '/badges' });

    expect(screen.getByText('로그인하면 뱃지와 레벨을 확인할 수 있어요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('전체 뱃지 6종을 렌더링한다', async () => {
    renderWithRouter(<Badges />, { route: '/badges' });

    // 보유 뱃지는 바로 표시
    await waitFor(() => {
      expect(screen.getByText('첫 차록')).toBeInTheDocument();
    });

    // 미보유 뱃지 토글 열기
    fireEvent.click(screen.getByText(/미보유 뱃지/));

    for (const badge of ALL_BADGES) {
      expect(screen.getByText(badge.name)).toBeInTheDocument();
    }
  });

  it('획득한 뱃지와 미획득 뱃지를 구분한다', async () => {
    renderWithRouter(<Badges />, { route: '/badges' });

    await waitFor(() => {
      expect(screen.getByText('첫 차록')).toBeInTheDocument();
    });

    const earnedBadgeIds = new Set(mockUserLevel.badges.map((b) => b.id));
    const earnedCount = ALL_BADGES.filter((b) => earnedBadgeIds.has(b.id)).length;
    const unearnedCount = ALL_BADGES.length - earnedCount;

    const earnedElements = screen.getAllByTestId('badge-earned');
    expect(earnedElements).toHaveLength(earnedCount);

    // 미보유 뱃지는 토글 클릭 후 표시
    expect(screen.queryAllByTestId('badge-locked')).toHaveLength(0);
    fireEvent.click(screen.getByText(`미보유 뱃지 (${unearnedCount})`));
    expect(screen.getAllByTestId('badge-locked')).toHaveLength(unearnedCount);
  });

  it('레벨 진행률을 표시한다', async () => {
    renderWithRouter(<Badges />, { route: '/badges' });

    await waitFor(() => {
      expect(screen.getByText('내 레벨')).toBeInTheDocument();
    });

    expect(screen.getAllByText('수련').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lv.2')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBe(3);
  });

  it('뱃지 획득 조건을 표시한다', async () => {
    renderWithRouter(<Badges />, { route: '/badges' });

    await waitFor(() => {
      expect(screen.getByText('첫 차록')).toBeInTheDocument();
    });

    // 미보유 뱃지 토글 열기
    fireEvent.click(screen.getByText(/미보유 뱃지/));

    for (const badge of ALL_BADGES) {
      expect(screen.getByText(badge.threshold)).toBeInTheDocument();
    }
  });

  it('로딩 상태를 표시한다', () => {
    vi.mocked(usersApi.getLevel).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Badges />, { route: '/badges' });

    expect(screen.getByRole('status', { name: /로딩/i })).toBeInTheDocument();
  });

  it('인증 로딩 중에는 로딩 스피너를 표시한다', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthReturn,
      user: null,
      isLoading: true,
      token: null,
    });

    renderWithRouter(<Badges />, { route: '/badges' });

    expect(screen.getByRole('status', { name: /로딩/i })).toBeInTheDocument();
  });
});
