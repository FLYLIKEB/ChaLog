import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { Home } from '../Home';
import { renderWithRouter } from '../../test/renderWithRouter';

vi.mock('../../contexts/AppModeContext', () => ({
  useAppMode: () => ({
    sessionMode: { active: false },
    blindMode: { active: false },
    toggleSessionMode: vi.fn(),
    toggleBlindMode: vi.fn(),
  }),
}));

vi.mock('../../lib/api', () => ({
  notesApi: {
    getAll: vi.fn(() => Promise.resolve([])),
    getCalendar: vi.fn(() => Promise.resolve({ dates: [], streak: { current: 0, longest: 0 } })),
    getByDate: vi.fn(() => Promise.resolve([])),
  },
  teasApi: {
    getAll: vi.fn(() => Promise.resolve([])),
    getTrending: vi.fn(() => Promise.resolve([])),
  },
  usersApi: {
    getTrending: vi.fn(() => Promise.resolve([])),
    getOnboardingPreference: vi.fn(() => Promise.resolve({ hasCompletedOnboarding: true })),
  },
  authApi: {
    getMe: vi.fn(() => Promise.resolve({ user: null })),
  },
  tagsApi: {
    getFollowedTags: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      authLoading: false,
      hasCompletedOnboarding: true,
      isOnboardingLoading: false,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('Home 페이지', () => {
  it('홈 컴포넌트가 에러 없이 렌더링된다', () => {
    const { container } = renderWithRouter(<Home />, { route: '/' });
    expect(container).toBeTruthy();
  });

  it('모드 카드가 표시된다', async () => {
    renderWithRouter(<Home />, { route: '/' });
    await waitFor(() => {
      expect(screen.getByText('다회 모드')).toBeInTheDocument();
    });
  });

  it('인기차 섹션은 홈에 표시하지 않는다', async () => {
    renderWithRouter(<Home />, { route: '/' });
    expect(screen.queryByText(/요즘 인기 차/)).not.toBeInTheDocument();
  });

  it('피드 섹션 "차록 흐름" 텍스트가 존재한다', async () => {
    renderWithRouter(<Home />, { route: '/' });
    await waitFor(() => {
      expect(screen.getByText('차록 흐름')).toBeInTheDocument();
    });
  });

  it('"탐색에서 전체 보기" 버튼 텍스트가 존재한다', async () => {
    renderWithRouter(<Home />, { route: '/' });
    await waitFor(() => {
      expect(screen.getByText('탐색에서 전체 보기')).toBeInTheDocument();
    });
  });
});
