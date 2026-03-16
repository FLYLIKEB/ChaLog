import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EmailVerificationBanner } from '../EmailVerificationBanner';
import { renderWithRouter } from '../../test/renderWithRouter';

const mockResendVerification = vi.fn();

vi.mock('../../lib/api', () => ({
  authApi: {
    getMe: vi.fn(() => Promise.resolve({ user: { id: 1, email: 'test@example.com', name: 'Test', emailVerifiedAt: null } })),
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
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
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

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('배너가 렌더링된다', () => {
    renderWithRouter(<EmailVerificationBanner />);
    expect(screen.getByText('이메일 인증이 필요합니다.')).toBeTruthy();
  });

  it('재발송 버튼이 표시된다', () => {
    renderWithRouter(<EmailVerificationBanner />);
    expect(screen.getByText('인증 메일 재발송')).toBeTruthy();
  });

  it('재발송 버튼 클릭 시 resendVerification을 호출한다', async () => {
    mockResendVerification.mockResolvedValueOnce({ message: '인증 메일이 재발송되었습니다.' });

    renderWithRouter(<EmailVerificationBanner />);

    await userEvent.click(screen.getByText('인증 메일 재발송'));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalled();
    });
  });

  it('닫기 버튼 클릭 시 배너가 사라진다', async () => {
    renderWithRouter(<EmailVerificationBanner />);

    const closeButton = screen.getByLabelText('닫기');
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('이메일 인증이 필요합니다.')).toBeNull();
    });
  });
});
