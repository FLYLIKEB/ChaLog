import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from 'next-themes';
import { Settings } from '../Settings';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockSetTheme = vi.fn();

vi.mock('next-themes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-themes')>();
  return {
    ...actual,
    useTheme: vi.fn(),
  };
});

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
    info: vi.fn(),
  },
}));

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: () => vi.fn(),
}));

describe('Settings 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
      themes: ['light', 'dark', 'system'],
    } as ReturnType<typeof useTheme>);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      token: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });
  });

  describe('테마 섹션', () => {
    it('테마 섹션 제목을 렌더링해야 함', () => {
      renderWithRouter(<Settings />, { route: '/settings' });
      expect(screen.getByRole('heading', { name: '테마' })).toBeInTheDocument();
    });

    it('라이트, 다크, 시스템 옵션을 렌더링해야 함', () => {
      renderWithRouter(<Settings />, { route: '/settings' });
      expect(screen.getByLabelText('라이트 모드')).toBeInTheDocument();
      expect(screen.getByLabelText('다크 모드')).toBeInTheDocument();
      expect(screen.getByLabelText('시스템 설정 따르기')).toBeInTheDocument();
    });

    it('다크 모드 버튼 클릭 시 setTheme을 호출해야 함', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Settings />, { route: '/settings' });
      await user.click(screen.getByLabelText('다크 모드'));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('라이트 모드 버튼 클릭 시 setTheme을 호출해야 함', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Settings />, { route: '/settings' });
      await user.click(screen.getByLabelText('라이트 모드'));
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    describe('시스템 버튼 클릭', () => {
      beforeEach(() => {
        vi.mocked(useTheme).mockReturnValue({
          theme: 'light',
          setTheme: mockSetTheme,
          resolvedTheme: 'light',
          themes: ['light', 'dark', 'system'],
        } as ReturnType<typeof useTheme>);
      });

      it('setTheme을 호출해야 함', async () => {
        const user = userEvent.setup();
        renderWithRouter(<Settings />, { route: '/settings' });
        await user.click(screen.getByLabelText('시스템 설정 따르기'));
        expect(mockSetTheme).toHaveBeenCalledWith('system');
      });
    });
  });
});
