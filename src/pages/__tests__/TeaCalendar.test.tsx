import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeaCalendar } from '../TeaCalendar';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { notesApi } from '../../lib/api';

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return {
    ...actual,
    notesApi: {
      ...actual.notesApi,
      getCalendar: vi.fn(),
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockNavigate = vi.fn();

const mockUser = {
  id: 1,
  name: '차인',
  email: 'cha@example.com',
};

const mockCalendarData = {
  dates: ['2026-03-01', '2026-03-05', '2026-03-10'],
  streak: { current: 3, longest: 7 },
};

const mockAuthValue = {
  user: mockUser,
  isAuthenticated: true,
  isAdmin: false,
  isLoading: false,
  isOnboardingLoading: false,
  hasCompletedOnboarding: true,
  token: 'mock-token',
  login: vi.fn(),
  register: vi.fn(),
  loginWithKakao: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
  refreshAuth: vi.fn(),
} as unknown as ReturnType<typeof useAuth>;

describe('TeaCalendar 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthValue);
    vi.mocked(notesApi.getCalendar).mockResolvedValue(mockCalendarData);
  });

  it('스트릭 정보를 표시한다', async () => {
    renderWithRouter(<TeaCalendar />);

    await waitFor(() => {
      expect(screen.getByText('현재 연속')).toBeDefined();
      expect(screen.getByText('최장 연속')).toBeDefined();
    });
  });

  it('이번 달 차록 수를 표시한다', async () => {
    renderWithRouter(<TeaCalendar />);

    await waitFor(() => {
      expect(screen.getByText('3개')).toBeDefined();
    });
  });

  it('미인증 사용자는 로그인 페이지로 리다이렉트된다', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthValue,
      user: null,
      isAuthenticated: false,
    });

    renderWithRouter(<TeaCalendar />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
