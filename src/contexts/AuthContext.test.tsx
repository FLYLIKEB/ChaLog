import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, isKakaoLoginCallbackUrl } from './AuthContext';
import { authApi, usersApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  authApi: {
    getMe: vi.fn(),
  },
  usersApi: {
    getOnboardingPreference: vi.fn(),
  },
}));

describe('AuthProvider initial session check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    vi.mocked(authApi.getMe).mockResolvedValue({
      user: { id: 1, email: 'user@example.com', name: 'User' },
    });
    vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue({
      hasCompletedOnboarding: true,
    });
  });

  it('recognizes Kakao login callback URLs only on /login with a code', () => {
    expect(isKakaoLoginCallbackUrl({ pathname: '/login', search: '?code=abc' })).toBe(true);
    expect(isKakaoLoginCallbackUrl({ pathname: '/login', search: '' })).toBe(false);
    expect(isKakaoLoginCallbackUrl({ pathname: '/login', search: '?code=' })).toBe(false);
    expect(isKakaoLoginCallbackUrl({ pathname: '/settings', search: '?code=abc' })).toBe(false);
  });

  it('checks the existing session on normal app entry', async () => {
    render(
      <AuthProvider>
        <div>app</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(authApi.getMe).toHaveBeenCalledTimes(1));
  });

  it('skips the initial session check during Kakao login callback handling', async () => {
    window.history.replaceState({}, '', '/login?code=kakao-code');

    render(
      <AuthProvider>
        <div>app</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(authApi.getMe).not.toHaveBeenCalled());
  });
});
