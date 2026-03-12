import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { authApi, usersApi } from '../lib/api';
import { loadKakaoSdk, initKakaoSdk } from '../lib/kakaoSdk';
import { loginWithKakaoOAuth, loginWithGoogleOAuth } from '../lib/oauthProviders';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

// 카카오 SDK 타입 선언
declare global {
  interface Window {
    Kakao: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (options: { redirectUri: string; state?: string; scope?: string; throughTalk?: boolean; prompts?: string }) => void;
        login: (options: { success: (authObj: any) => void; fail: (err: any) => void }) => void;
        getAccessToken: () => string | null;
        logout?: () => void;
      };
    };
  }
}

interface User {
  id: number;
  email: string | null;
  name: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean | null;
  isOnboardingLoading: boolean;
  login: (email: string, password: string) => Promise<boolean | null>;
  register: (email: string, name: string, password: string) => Promise<boolean | null>;
  loginWithKakao: (code?: string) => Promise<boolean | null>;
  loginWithGoogle: (accessToken: string) => Promise<boolean | null>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshOnboardingStatus: (userId: number) => Promise<boolean | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        logger.error('Failed to parse stored user data', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);

    let isCancelled = false;

    const initKakaoSDK = async () => {
      if (typeof window === 'undefined') return;

      const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
      if (!kakaoAppKey) {
        logger.warn('[SDK 초기화] VITE_KAKAO_APP_KEY가 설정되지 않았습니다.');
        return;
      }

      if (window.Kakao?.isInitialized?.()) return;

      try {
        await loadKakaoSdk();
        if (!isCancelled) await initKakaoSdk(kakaoAppKey);
      } catch (error) {
        logger.error('[SDK 초기화] 카카오 SDK 초기화 실패:', error);
      }
    };

    initKakaoSDK();

    return () => {
      isCancelled = true;
    };
  }, []);

  const refreshOnboardingStatus = useCallback(async (userId: number) => {
    setIsOnboardingLoading(true);
    try {
      const preference = await usersApi.getOnboardingPreference(userId);
      setHasCompletedOnboarding(preference.hasCompletedOnboarding);
      return preference.hasCompletedOnboarding;
    } catch (error) {
      logger.error('Failed to load onboarding status:', error);
      setHasCompletedOnboarding(null);
      return null;
    } finally {
      setIsOnboardingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !token) return;
    refreshOnboardingStatus(user.id);
  }, [refreshOnboardingStatus, token, user]);

  useEffect(() => {
    if (!token || !user || user.role) return;
    authApi
      .getMe()
      .then((res) => {
        const updated = { ...user, ...res.user };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      })
      .catch((err) => {
        logger.error('Failed to revalidate user role', err);
      });
  }, [token, user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      const onboardingCompleted = await refreshOnboardingStatus(response.user.id);
      toast.success('로그인되었습니다.');
      return onboardingCompleted;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.');
      throw error;
    }
  }, [refreshOnboardingStatus]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    try {
      const response = await authApi.register({ email, name, password });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      const onboardingCompleted = await refreshOnboardingStatus(response.user.id);
      toast.success('회원가입이 완료되었습니다.');
      return onboardingCompleted;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
      throw error;
    }
  }, [refreshOnboardingStatus]);

  const loginWithKakao = useCallback(async (code?: string) => {
    const startTime = Date.now();
    logger.info('=== 카카오 로그인 시작 ===', { hasCode: !!code });

    try {
      if (typeof window === 'undefined') {
        toast.error('브라우저 환경에서만 사용할 수 있습니다.');
        return null;
      }

      const response = await loginWithKakaoOAuth(code);

      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      const onboardingCompleted = await refreshOnboardingStatus(response.user.id);

      logger.info(`=== 카카오 로그인 완료 (소요 시간: ${Date.now() - startTime}ms) ===`);
      toast.success('카카오 로그인되었습니다.');
      return onboardingCompleted;
    } catch (error) {
      if (error instanceof Error && (error.message === 'REDIRECT' || error.message === 'ALREADY_USED_CODE')) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : '카카오 로그인에 실패했습니다.';
      logger.error(`=== 카카오 로그인 실패 (소요 시간: ${Date.now() - startTime}ms) ===`, { error });
      toast.error(errorMessage);
      throw error;
    }
  }, [refreshOnboardingStatus]);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    try {
      const response = await loginWithGoogleOAuth(accessToken);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      const onboardingCompleted = await refreshOnboardingStatus(response.user.id);
      toast.success('구글 로그인되었습니다.');
      return onboardingCompleted;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '구글 로그인에 실패했습니다.');
      throw error;
    }
  }, [refreshOnboardingStatus]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setHasCompletedOnboarding(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    try {
      if (typeof window !== 'undefined' && window.Kakao?.Auth?.getAccessToken?.()) {
        if (window.Kakao.Auth.logout) {
          window.Kakao.Auth.logout();
        }
      }
    } catch (error) {
      logger.error('Kakao logout failed', error);
    }

    toast.success('로그아웃되었습니다.');
  }, []);

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  const contextValue: AuthContextType = useMemo(
    () => ({
      user,
      token,
      isLoading,
      hasCompletedOnboarding,
      isOnboardingLoading,
      login,
      register,
      loginWithKakao,
      loginWithGoogle,
      logout,
      isAuthenticated,
      isAdmin,
      refreshOnboardingStatus,
    }),
    [user, token, isLoading, hasCompletedOnboarding, isOnboardingLoading, login, register, loginWithKakao, loginWithGoogle, logout, isAuthenticated, isAdmin, refreshOnboardingStatus]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
