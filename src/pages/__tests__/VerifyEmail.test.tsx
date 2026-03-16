import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VerifyEmail } from '../VerifyEmail';
import { renderWithRouter } from '../../test/renderWithRouter';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockVerifyEmail = vi.fn();
const mockResendVerification = vi.fn();

vi.mock('../../lib/api', () => ({
  authApi: {
    getMe: vi.fn(() => Promise.resolve({ user: { id: 1, email: 'test@example.com', name: 'Test', emailVerifiedAt: null } })),
    verifyEmail: (token: string) => mockVerifyEmail(token),
    resendVerification: () => mockResendVerification(),
  },
  usersApi: {
    getOnboardingPreference: vi.fn(() => Promise.resolve({ hasCompletedOnboarding: true })),
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 1, email: 'test@example.com', name: 'Test', emailVerifiedAt: null },
      token: 'cookie',
      isLoading: false,
      isAuthenticated: true,
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import React from 'react';

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('token이 없으면 안내 메시지를 표시한다', async () => {
    renderWithRouter(<VerifyEmail />, { route: '/verify-email' });

    await waitFor(() => {
      expect(screen.getByText('이메일 인증 메일을 확인해주세요')).toBeTruthy();
    });
  });

  it('token이 없으면 재발송 버튼을 렌더링한다', async () => {
    renderWithRouter(<VerifyEmail />, { route: '/verify-email' });

    await waitFor(() => {
      expect(screen.getByText('인증 메일 재발송')).toBeTruthy();
    });
  });

  it('token이 있으면 자동으로 인증 API를 호출한다', async () => {
    mockVerifyEmail.mockResolvedValueOnce({ message: '이메일이 인증되었습니다.' });

    renderWithRouter(<VerifyEmail />, { route: '/verify-email?token=test-token-123' });

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith('test-token-123');
    });
  });

  it('인증 성공 시 홈으로 이동한다', async () => {
    mockVerifyEmail.mockResolvedValueOnce({ message: '이메일이 인증되었습니다.' });

    renderWithRouter(<VerifyEmail />, { route: '/verify-email?token=valid-token' });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('인증 실패 시 에러 메시지와 재발송 버튼을 표시한다', async () => {
    mockVerifyEmail.mockRejectedValueOnce(new Error('만료된 인증 링크입니다.'));

    renderWithRouter(<VerifyEmail />, { route: '/verify-email?token=expired-token' });

    await waitFor(() => {
      expect(screen.getByText('인증 실패')).toBeTruthy();
    });
    expect(screen.getByText('인증 메일 재발송')).toBeTruthy();
  });

  it('재발송 버튼 클릭 시 resendVerification을 호출한다', async () => {
    mockResendVerification.mockResolvedValueOnce({ message: '인증 메일이 재발송되었습니다.' });

    renderWithRouter(<VerifyEmail />, { route: '/verify-email' });

    const resendButton = await screen.findByText('인증 메일 재발송');
    await userEvent.click(resendButton);

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalled();
    });
  });
});
