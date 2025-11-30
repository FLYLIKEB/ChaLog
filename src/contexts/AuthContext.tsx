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
        logout?: () => void;
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

    // 카카오 SDK 초기화 (스크립트 로드 대기)
    const initKakaoSDK = async () => {
      logger.info('[SDK 초기화] 카카오 SDK 초기화 프로세스 시작');
      
      if (typeof window === 'undefined') {
        logger.warn('[SDK 초기화] window 객체가 없어 초기화를 건너뜁니다.');
        return;
      }

      const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
      logger.debug('[SDK 초기화] 환경 변수 확인:', {
        hasAppKey: !!kakaoAppKey,
        appKeyLength: kakaoAppKey?.length || 0,
        appKeyPrefix: kakaoAppKey ? `${kakaoAppKey.substring(0, 8)}...` : '없음',
      });

      if (!kakaoAppKey) {
        logger.warn('[SDK 초기화] 카카오 앱 키가 설정되지 않았습니다. 환경 변수 VITE_KAKAO_APP_KEY를 확인해주세요.');
        return;
      }

      // 카카오 SDK가 이미 로드되고 초기화된 경우
      if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
        logger.info('[SDK 초기화] 카카오 SDK가 이미 초기화되어 있습니다.');
        return;
      }

      logger.info('[SDK 초기화] 카카오 SDK 로드 대기 시작');
      logger.debug('[SDK 초기화] 초기 상태:', {
        windowKakaoExists: !!window.Kakao,
        hasInitFunction: !!(window.Kakao && typeof window.Kakao.init === 'function'),
        hasIsInitialized: !!(window.Kakao && typeof window.Kakao.isInitialized === 'function'),
      });

      // 카카오 SDK 로드 대기 (최대 10초)
      let attempts = 0;
      const maxAttempts = 100; // 10초 (100ms * 100)
      
      await new Promise<void>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          attempts++;
          
          // 카카오 SDK가 로드되었는지 확인
          if (window.Kakao && typeof window.Kakao.init === 'function' && typeof window.Kakao.isInitialized === 'function') {
            clearInterval(checkInterval);
            logger.info(`[SDK 초기화] 카카오 SDK 로드 완료 (시도 횟수: ${attempts})`);
            
            // 초기화되지 않았다면 초기화
            if (!window.Kakao.isInitialized()) {
              try {
                logger.info('[SDK 초기화] 카카오 SDK 초기화 시도 중...');
                window.Kakao.init(kakaoAppKey);
                const isInit = window.Kakao.isInitialized();
                logger.info('[SDK 초기화] 카카오 SDK 초기화 완료:', {
                  isInitialized: isInit,
                });
              } catch (error) {
                logger.error('[SDK 초기화] 카카오 SDK 초기화 실패:', {
                  error,
                  errorMessage: error instanceof Error ? error.message : String(error),
                });
                reject(error);
                return;
              }
            } else {
              logger.info('[SDK 초기화] 카카오 SDK가 이미 초기화되어 있었습니다.');
            }
            
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            const error = new Error('카카오 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하고 페이지를 새로고침해주세요.');
            logger.error(`[SDK 초기화] 카카오 SDK 로드 시간 초과 (시도 횟수: ${attempts}):`, error);
            reject(error);
          } else if (attempts % 20 === 0) {
            logger.debug(`[SDK 초기화] SDK 로드 대기 중... (${attempts}/${maxAttempts})`);
          }
        }, 100);
      }).catch((error) => {
        logger.error('[SDK 초기화] 카카오 SDK 초기화 중 오류 발생:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });
    };

    initKakaoSDK();
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
    const startTime = Date.now();
    logger.info('=== 카카오 로그인 시작 ===');
    
    try {
      // 1. 브라우저 환경 확인
      if (typeof window === 'undefined') {
        logger.error('[1/7] 브라우저 환경 확인 실패: window 객체가 없습니다.');
        toast.error('브라우저 환경에서만 사용할 수 있습니다.');
        return;
      }
      logger.info('[1/7] 브라우저 환경 확인 완료');

      // 2. 환경 변수 확인
      const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
      logger.info('[2/7] 환경 변수 확인:', {
        hasAppKey: !!kakaoAppKey,
        appKeyLength: kakaoAppKey?.length || 0,
        appKeyPrefix: kakaoAppKey ? `${kakaoAppKey.substring(0, 8)}...` : '없음',
        currentOrigin: window.location.origin,
        currentUrl: window.location.href,
      });
      
      if (!kakaoAppKey) {
        const errorMsg = '카카오 앱 키가 설정되지 않았습니다. 환경 변수 VITE_KAKAO_APP_KEY를 확인해주세요.';
        logger.error('[2/7] 환경 변수 확인 실패:', errorMsg);
        toast.error(errorMsg);
        return;
      }

      // 3. 카카오 SDK 로드 확인 및 대기
      logger.info('[3/7] 카카오 SDK 로드 확인 시작');
      logger.debug('[3/7] SDK 상태:', {
        windowKakaoExists: !!window.Kakao,
        hasInitFunction: !!(window.Kakao && typeof window.Kakao.init === 'function'),
        hasIsInitialized: !!(window.Kakao && typeof window.Kakao.isInitialized === 'function'),
        isInitialized: window.Kakao?.isInitialized?.() || false,
      });

      if (!window.Kakao || typeof window.Kakao.init !== 'function') {
        logger.info('[3/7] 카카오 SDK 로드 대기 중...');
        await new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 100; // 10초
          const checkInterval = setInterval(() => {
            attempts++;
            if (window.Kakao && typeof window.Kakao.init === 'function') {
              clearInterval(checkInterval);
              logger.info(`[3/7] 카카오 SDK 로드 완료 (시도 횟수: ${attempts})`);
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              logger.error(`[3/7] 카카오 SDK 로드 시간 초과 (시도 횟수: ${attempts})`);
              reject(new Error('카카오 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하고 페이지를 새로고침해주세요.'));
            } else if (attempts % 10 === 0) {
              logger.debug(`[3/7] SDK 로드 대기 중... (${attempts}/${maxAttempts})`);
            }
          }, 100);
        });
      } else {
        logger.info('[3/7] 카카오 SDK 이미 로드됨');
      }

      // 4. 카카오 SDK 초기화 확인 및 초기화
      logger.info('[4/7] 카카오 SDK 초기화 확인');
      const isInitialized = window.Kakao.isInitialized && window.Kakao.isInitialized();
      logger.debug('[4/7] 초기화 상태:', {
        isInitialized,
        hasIsInitialized: !!window.Kakao.isInitialized,
      });

      if (!isInitialized) {
        try {
          logger.info('[4/7] 카카오 SDK 초기화 시도 중...', {
            appKey: `${kakaoAppKey.substring(0, 8)}...`,
          });
          window.Kakao.init(kakaoAppKey);
          const afterInit = window.Kakao.isInitialized();
          logger.info('[4/7] 카카오 SDK 초기화 완료:', {
            isInitialized: afterInit,
          });
        } catch (error) {
          logger.error('[4/7] 카카오 SDK 초기화 실패:', {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            appKey: `${kakaoAppKey.substring(0, 8)}...`,
          });
          throw new Error('카카오 SDK 초기화에 실패했습니다. 카카오 앱 키를 확인해주세요.');
        }
      } else {
        logger.info('[4/7] 카카오 SDK 이미 초기화됨');
      }

      // 5. 카카오 로그인 API 확인
      logger.info('[5/7] 카카오 로그인 API 확인');
      logger.debug('[5/7] API 상태:', {
        hasAuth: !!window.Kakao.Auth,
        hasLoginFunction: !!(window.Kakao.Auth && typeof window.Kakao.Auth.login === 'function'),
        hasGetAccessToken: !!(window.Kakao.Auth && typeof window.Kakao.Auth.getAccessToken === 'function'),
      });

      if (!window.Kakao.Auth || typeof window.Kakao.Auth.login !== 'function') {
        logger.error('[5/7] 카카오 로그인 API 사용 불가');
        throw new Error('카카오 로그인 API를 사용할 수 없습니다. 페이지를 새로고침해주세요.');
      }

      // 6. 카카오 로그인 실행
      logger.info('[6/7] 카카오 로그인 요청 시작', {
        origin: window.location.origin,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50),
      });

      await new Promise<void>((resolve, reject) => {
        window.Kakao.Auth.login({
          success: (authObj) => {
            logger.info('[6/7] 카카오 로그인 성공:', {
              hasAuthObj: !!authObj,
              authObjKeys: authObj ? Object.keys(authObj) : [],
            });
            resolve();
          },
          fail: (err) => {
            logger.error('[6/7] 카카오 로그인 실패:', {
              error: err,
              errorCode: err?.error,
              errorDescription: err?.error_description,
              errorMsg: err?.msg,
              fullError: JSON.stringify(err, null, 2),
              origin: window.location.origin,
              url: window.location.href,
            });
            
            let errorMessage = '카카오 로그인에 실패했습니다.';
            
            // 카카오 오류 코드에 따른 메시지
            if (err?.error) {
              if (err.error === 'KOE009') {
                const currentOrigin = window.location.origin;
                errorMessage = `카카오 개발자 콘솔 설정이 완료되지 않았습니다.\n\n현재 사용 중인 도메인: ${currentOrigin}\n\n다음을 확인하세요:\n1. 앱 설정 → 플랫폼 → Web 플랫폼에 "${currentOrigin}" 등록\n2. 제품 설정 → 카카오 로그인 → Redirect URI에 "${currentOrigin}" 등록\n3. 설정 저장 후 5-10분 대기 (반영 시간)\n\n자세한 내용: docs/development/KAKAO_DEVELOPER_SETUP.md`;
              } else if (err.error === 'KOE006') {
                errorMessage = '카카오 앱 키가 올바르지 않습니다. 환경 변수 VITE_KAKAO_APP_KEY를 확인해주세요.';
              } else if (err.error === 'KOE101') {
                const currentOrigin = window.location.origin;
                errorMessage = `Redirect URI가 등록되지 않았습니다.\n\n카카오 개발자 콘솔에서 다음을 등록하세요:\n제품 설정 → 카카오 로그인 → Redirect URI에 "${currentOrigin}" 추가`;
              } else if (err.error_description) {
                errorMessage = err.error_description;
              }
            }
            
            reject(new Error(errorMessage));
          },
        });
      });

      // 7. 액세스 토큰 가져오기
      logger.info('[7/7] 카카오 액세스 토큰 획득 시도');
      const kakaoAccessToken = window.Kakao.Auth.getAccessToken();
      logger.debug('[7/7] 액세스 토큰 상태:', {
        hasToken: !!kakaoAccessToken,
        tokenLength: kakaoAccessToken?.length || 0,
        tokenPrefix: kakaoAccessToken ? `${kakaoAccessToken.substring(0, 20)}...` : '없음',
      });

      if (!kakaoAccessToken) {
        logger.error('[7/7] 액세스 토큰 획득 실패');
        throw new Error('카카오 액세스 토큰을 가져올 수 없습니다.');
      }

      logger.info('[7/7] 카카오 액세스 토큰 획득 완료, 백엔드로 전송 중...');

      // 백엔드로 카카오 액세스 토큰 전송
      logger.info('[백엔드] 카카오 로그인 API 호출 시작');
      const response = await authApi.loginWithKakao({ accessToken: kakaoAccessToken });
      logger.info('[백엔드] 카카오 로그인 API 호출 성공:', {
        hasAccessToken: !!response.access_token,
        hasUser: !!response.user,
        userId: response.user?.id,
        userName: response.user?.name,
      });

      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      const elapsedTime = Date.now() - startTime;
      logger.info(`=== 카카오 로그인 완료 (소요 시간: ${elapsedTime}ms) ===`);
      
      toast.success('카카오 로그인되었습니다.');
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '카카오 로그인에 실패했습니다.';
      logger.error(`=== 카카오 로그인 실패 (소요 시간: ${elapsedTime}ms) ===`, {
        error,
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        origin: window.location.origin,
        url: window.location.href,
      });
      toast.error(errorMessage);
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
        // 카카오 SDK의 logout 메서드가 있는 경우에만 호출
        if (window.Kakao.Auth.logout) {
          window.Kakao.Auth.logout();
        }
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

