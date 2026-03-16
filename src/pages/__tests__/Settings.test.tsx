import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from 'next-themes';
import { Settings } from '../Settings';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  requestEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  getLinkedAccounts: vi.fn(),
  getNotificationSetting: vi.fn(),
  updateNotificationSetting: vi.fn(),
  updateProfile: vi.fn(),
  unlinkAccount: vi.fn(),
}));

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    authApi: {
      ...(actual as { authApi: object }).authApi,
      changePassword: mocks.changePassword,
      requestEmailChange: mocks.requestEmailChange,
      confirmEmailChange: mocks.confirmEmailChange,
    },
    usersApi: {
      getLinkedAccounts: mocks.getLinkedAccounts,
      getNotificationSetting: mocks.getNotificationSetting,
      updateNotificationSetting: mocks.updateNotificationSetting,
      updateProfile: mocks.updateProfile,
      unlinkAccount: mocks.unlinkAccount,
    },
  };
});

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

const mockLogout = vi.fn();

describe('Settings 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLinkedAccounts.mockResolvedValue([
      { id: 1, provider: 'email', providerId: 'test@example.com', hasCredential: true },
    ]);
    mocks.getNotificationSetting.mockResolvedValue({ isNotificationEnabled: true });
    mocks.updateNotificationSetting.mockResolvedValue({ isNotificationEnabled: true });
    mocks.updateProfile.mockResolvedValue({});
    mocks.unlinkAccount.mockResolvedValue({});
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
      logout: mockLogout,
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

  describe('비밀번호 변경 (이메일 계정)', () => {
    beforeEach(() => {
      mocks.getLinkedAccounts.mockResolvedValue([
        { id: 1, provider: 'email', providerId: 'test@example.com', hasCredential: true },
      ]);
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' },
        isAuthenticated: true,
        isAdmin: false,
        isLoading: false,
        token: 'cookie',
        login: vi.fn(),
        register: vi.fn(),
        loginWithKakao: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: mockLogout,
        hasCompletedOnboarding: true,
        isOnboardingLoading: false,
        refreshOnboardingStatus: vi.fn(),
      });
    });

    it('이메일 계정 행에 비밀번호 변경 버튼이 표시되어야 함', async () => {
      renderWithRouter(<Settings />, { route: '/settings' });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument();
      });
    });

    it('비밀번호 변경 버튼 클릭 시 모달이 열려야 함', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Settings />, { route: '/settings' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));

      expect(screen.getByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument();
      expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument();
      expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
      expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument();
    });
  });

  describe('이메일 변경 (이메일 계정)', () => {
    beforeEach(() => {
      mocks.getLinkedAccounts.mockResolvedValue([
        { id: 1, provider: 'email', providerId: 'test@example.com', hasCredential: true },
      ]);
      mocks.requestEmailChange.mockResolvedValue({ message: '인증 메일이 발송되었습니다.' });
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'user' },
        isAuthenticated: true,
        isAdmin: false,
        isLoading: false,
        token: 'cookie',
        login: vi.fn(),
        register: vi.fn(),
        loginWithKakao: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: mockLogout,
        hasCompletedOnboarding: true,
        isOnboardingLoading: false,
        refreshOnboardingStatus: vi.fn(),
      });
    });

    it('프로필 섹션에 이메일 변경 버튼이 표시되어야 함', async () => {
      renderWithRouter(<Settings />, { route: '/settings' });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /변경/ })).toBeInTheDocument();
      });
    });

    it('이메일 변경 버튼 클릭 시 모달이 열려야 함', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Settings />, { route: '/settings' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /변경/ })).toBeInTheDocument();
      });

      // Find the email change button in the profile section (has Mail icon + 변경 text)
      const changeButtons = screen.getAllByRole('button', { name: /변경/ });
      const emailChangeBtn = changeButtons.find((btn) => btn.textContent?.includes('변경') && !btn.textContent?.includes('비밀번호'));
      if (emailChangeBtn) await user.click(emailChangeBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '이메일 변경' })).toBeInTheDocument();
      });
      expect(screen.getByLabelText('새 이메일 주소')).toBeInTheDocument();
    });

    it('이메일 변경 모달 닫기', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Settings />, { route: '/settings' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /변경/ })).toBeInTheDocument();
      });

      const changeButtons = screen.getAllByRole('button', { name: /변경/ });
      const emailChangeBtn = changeButtons.find((btn) => btn.textContent?.includes('변경') && !btn.textContent?.includes('비밀번호'));
      if (emailChangeBtn) await user.click(emailChangeBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '이메일 변경' })).toBeInTheDocument();
      });

      // Close via ESC
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: '이메일 변경' })).not.toBeInTheDocument();
      });
    });
  });
});
