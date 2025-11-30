import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthResponse } from '../lib/api';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

// 카카오 SDK 타입 선언
declare global {
  interface Window {
    Kakao: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Auth: {
        login: (options: { success: (authObj: any) => void; fail: (err: any) => void }) => void;
        getAccessToken: () => string | null;
      };
    };
  }
}

interface User {
  id: number;
  email: string | null;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  loginWithKakao: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 토큰과 사용자 정보 복원
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

    // 카카오 SDK 초기화
    const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
    if (kakaoAppKey && typeof window !== 'undefined' && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoAppKey);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('로그인되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.');
      throw error;
    }
  };

  const register = async (email: string, name: string, password: string) => {
    try {
      const response = await authApi.register({ email, name, password });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('회원가입이 완료되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
      throw error;
    }
  };

  const loginWithKakao = async () => {
    try {
      if (typeof window === 'undefined' || !window.Kakao) {
        toast.error('카카오 SDK를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
        return;
      }

      const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
      if (!kakaoAppKey) {
        toast.error('카카오 앱 키가 설정되지 않았습니다.');
        return;
      }

      // 카카오 SDK 초기화
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoAppKey);
      }

      // 카카오 로그인
      await new Promise<void>((resolve, reject) => {
        window.Kakao.Auth.login({
          success: () => {
            resolve();
          },
          fail: (err) => {
            reject(new Error('카카오 로그인에 실패했습니다.'));
          },
        });
      });

      // 액세스 토큰 가져오기
      const kakaoAccessToken = window.Kakao.Auth.getAccessToken();
      if (!kakaoAccessToken) {
        throw new Error('카카오 액세스 토큰을 가져올 수 없습니다.');
      }

      // 백엔드로 카카오 액세스 토큰 전송
      const response = await authApi.loginWithKakao({ accessToken: kakaoAccessToken });
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('카카오 로그인되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '카카오 로그인에 실패했습니다.');
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // 카카오 로그아웃 (선택사항)
    try {
      if (typeof window !== 'undefined' && window.Kakao?.Auth?.getAccessToken?.()) {
        window.Kakao.Auth.logout();
      }
    } catch (error) {
      logger.error('Kakao logout failed', error);
    }
    
    toast.success('로그아웃되었습니다.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithKakao,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
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

