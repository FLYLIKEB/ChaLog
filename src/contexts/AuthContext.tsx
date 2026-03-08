import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { authApi, usersApi } from '../lib/api';
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
        login: (options: { success: (authObj: any) => void; fail: (err: any) => void }) => void; // 구버전 호환
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

    // interval 추적을 위한 변수
    let checkInterval: NodeJS.Timeout | null = null;
    let isCancelled = false;

    // 카카오 SDK 동적 로드 및 초기화
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

      // 카카오 SDK 스크립트가 로드되어 있지 않은 경우 동적으로 로드
      if (!window.Kakao || typeof window.Kakao.init !== 'function') {
        logger.info('[SDK 초기화] 카카오 SDK 스크립트 동적 로드 시작');
        
        // 이미 스크립트 태그가 있는지 확인 (kakao.js / kakao.min.js 모두 포함)
        const existingScript = document.querySelector('script[src*="kakao"]') as HTMLScriptElement | null;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        // 공식 CDN 사용 (developers.kakao.com은 CORS 문제로 사용 불가)
        const primarySrc = 'https://t1.kakaocdn.net/kakao_js_sdk/2.5.0/kakao.min.js';
        const fallbackSrc = 'https://developers.kakao.com/sdk/js/kakao.min.js';

        const attachScript = (src: string) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.defer = true;
          script.crossOrigin = 'anonymous';

          script.onerror = (error) => {
            logger.error('[SDK 초기화] 카카오 SDK 스크립트 로드 실패:', {
              error,
              src,
              isMobile,
              userAgent: navigator.userAgent,
            });
            // 기본 CDN 실패 시 대체 CDN 한 번만 시도
            if (src !== fallbackSrc && !document.querySelector(`script[src="${fallbackSrc}"]`)) {
              logger.info('[SDK 초기화] 대체 CDN으로 재시도:', { fallbackSrc });
              attachScript(fallbackSrc);
            }
          };

          script.onload = () => {
            logger.info('[SDK 초기화] 카카오 SDK 스크립트 로드 완료 (onload 이벤트)', { src });
          };

          document.head.appendChild(script);
          logger.info('[SDK 초기화] 카카오 SDK 스크립트 태그 추가 완료', { src });
        };

        if (existingScript) {
          logger.info('[SDK 초기화] 카카오 SDK 스크립트 태그가 이미 존재합니다. 로드 대기 중...');
          
          // 스크립트가 이미 로드되었는지 확인
          const readyState = (existingScript as unknown as { readyState?: string }).readyState;
          if (readyState === 'complete' || readyState === 'loaded') {
            logger.info('[SDK 초기화] 스크립트가 이미 로드 완료 상태입니다.');
          }
        } else {
          // 스크립트 동적 로드 (기본 CDN → 실패 시 대체 CDN)
          attachScript(primarySrc);
        }
      }

      logger.info('[SDK 초기화] 카카오 SDK 로드 대기 시작');
      logger.debug('[SDK 초기화] 초기 상태:', {
        windowKakaoExists: !!window.Kakao,
        hasInitFunction: !!(window.Kakao && typeof window.Kakao.init === 'function'),
        hasIsInitialized: !!(window.Kakao && typeof window.Kakao.isInitialized === 'function'),
      });

      // 카카오 SDK 로드 대기 (최대 20초, 모바일 환경 고려하여 시간 증가)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const maxAttempts = isMobile ? 200 : 150; // 모바일: 20초, 데스크톱: 15초
      const checkIntervalMs = 100;
      
      let attempts = 0;
      
      try {
        await new Promise<void>((resolve, reject) => {
          checkInterval = setInterval(() => {
            // 컴포넌트가 언마운트된 경우 중단
            if (isCancelled || typeof window === 'undefined') {
              if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
              }
              return;
            }
            
            attempts++;
            
            // 카카오 SDK가 로드되었는지 확인
            if (window.Kakao && typeof window.Kakao.init === 'function' && typeof window.Kakao.isInitialized === 'function') {
              if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
              }
              logger.info(`[SDK 초기화] 카카오 SDK 로드 완료 (시도 횟수: ${attempts}, 모바일: ${isMobile})`);
              
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
              if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
              }
              const errorMessage = isMobile 
                ? '카카오 SDK를 불러올 수 없습니다. 모바일 네트워크 연결을 확인하고 Wi-Fi로 전환하거나 페이지를 새로고침해주세요.'
                : '카카오 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하고 페이지를 새로고침해주세요.';
              const error = new Error(errorMessage);
              logger.error(`[SDK 초기화] 카카오 SDK 로드 시간 초과 (시도 횟수: ${attempts}, 모바일: ${isMobile}):`, {
                error,
                userAgent: navigator.userAgent,
                networkType: (navigator as any).connection?.effectiveType || 'unknown',
              });
              reject(error);
            } else if (attempts % 20 === 0) {
              logger.debug(`[SDK 초기화] SDK 로드 대기 중... (${attempts}/${maxAttempts}, 모바일: ${isMobile})`);
            }
          }, checkIntervalMs);
        });
      } catch (error) {
        logger.error('[SDK 초기화] 카카오 SDK 초기화 중 오류 발생:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          isMobile,
        });
        // 카카오 SDK 초기화 실패해도 앱은 정상 작동해야 함
      }
    };

    initKakaoSDK();
    
    // cleanup 함수: 컴포넌트 언마운트 시 interval 정리
    return () => {
      isCancelled = true;
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
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
    if (!user || !token) {
      return;
    }
    refreshOnboardingStatus(user.id);
  }, [refreshOnboardingStatus, token, user]);

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
      // 1. 브라우저 환경 확인
      if (typeof window === 'undefined') {
        logger.error('[1/7] 브라우저 환경 확인 실패: window 객체가 없습니다.');
        toast.error('브라우저 환경에서만 사용할 수 있습니다.');
        return null;
      }
      logger.info('[1/7] 브라우저 환경 확인 완료');

      // code가 있으면 리다이렉트 후 처리
      if (code) {
        logger.info('[리다이렉트 후 처리] 인증 코드로 액세스 토큰 교환 시작');
        // code를 accessToken으로 교환 (카카오 REST API 사용)
        const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
        if (!kakaoAppKey) {
          throw new Error('카카오 앱 키가 설정되지 않았습니다.');
        }

        const redirectUri = `${window.location.origin}/login`;
        try {
          // 카카오 서버에 code를 전송하여 accessToken 받기
          const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: kakaoAppKey,
              redirect_uri: redirectUri,
              code: code,
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));

            // authorization code not found 에러는 이미 처리된 코드이므로 조용히 처리
            if (errorData.error === 'invalid_grant' || errorData.error_description?.includes('authorization code not found')) {
              logger.warn('[리다이렉트 후 처리] 인증 코드가 이미 사용되었거나 만료되었습니다. 이는 정상적인 상황일 수 있습니다.');
              return null;
            }

            logger.error('[리다이렉트 후 처리] 토큰 교환 실패:', errorData);
            throw new Error(`토큰 교환 실패: ${errorData.error_description || errorData.error || '알 수 없는 오류'}`);
          }

          const tokenData = await tokenResponse.json();
          const kakaoAccessToken = tokenData.access_token;

          if (!kakaoAccessToken) {
            throw new Error('액세스 토큰을 받을 수 없습니다.');
          }

          logger.info('[리다이렉트 후 처리] 액세스 토큰 획득 완료, 백엔드로 전송 중...');
          
          // 백엔드로 카카오 액세스 토큰 전송
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
          const onboardingCompleted = await refreshOnboardingStatus(response.user.id);
          
          const elapsedTime = Date.now() - startTime;
          logger.info(`=== 카카오 로그인 완료 (소요 시간: ${elapsedTime}ms) ===`);
          
          toast.success('카카오 로그인되었습니다.');
          return onboardingCompleted;
        } catch (error) {
          logger.error('[리다이렉트 후 처리] 토큰 교환 실패:', error);
          throw error;
        }
      }

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
        return null;
      }

      // 3. 카카오 SDK 로드 확인 및 동적 로드
      logger.info('[3/7] 카카오 SDK 로드 확인 시작');
      logger.debug('[3/7] SDK 상태:', {
        windowKakaoExists: !!window.Kakao,
        hasInitFunction: !!(window.Kakao && typeof window.Kakao.init === 'function'),
        hasIsInitialized: !!(window.Kakao && typeof window.Kakao.isInitialized === 'function'),
        isInitialized: window.Kakao?.isInitialized?.() || false,
      });

      if (!window.Kakao || typeof window.Kakao.init !== 'function') {
        logger.info('[3/7] 카카오 SDK 스크립트 동적 로드 시작');
        
        // 모바일 환경 감지
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        logger.debug('[3/7] 환경 정보:', {
          isMobile,
          userAgent: navigator.userAgent.substring(0, 50),
          networkType: (navigator as any).connection?.effectiveType || 'unknown',
        });
        
        // 이미 스크립트 태그가 있는지 확인 (kakao.js / kakao.min.js 모두 포함)
        const existingScript = document.querySelector('script[src*="kakao"]') as HTMLScriptElement | null;
        // 공식 CDN 사용 (developers.kakao.com은 CORS 문제로 사용 불가)
        const primarySrc = 'https://t1.kakaocdn.net/kakao_js_sdk/2.5.0/kakao.min.js';
        const fallbackSrc = 'https://developers.kakao.com/sdk/js/kakao.min.js';

        const attachScript = (src: string) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.defer = true;
          script.crossOrigin = 'anonymous';
          
          script.onerror = (error) => {
            logger.error('[3/7] 카카오 SDK 스크립트 로드 실패:', {
              error,
              isMobile,
              userAgent: navigator.userAgent,
              src,
            });
            if (src !== fallbackSrc && !document.querySelector(`script[src="${fallbackSrc}"]`)) {
              logger.info('[3/7] 대체 CDN으로 재시도:', { fallbackSrc });
              attachScript(fallbackSrc);
            }
          };
          
          script.onload = () => {
            logger.info('[3/7] 카카오 SDK 스크립트 로드 완료 (onload 이벤트)', { src });
          };
          
          document.head.appendChild(script);
          logger.info('[3/7] 카카오 SDK 스크립트 태그 추가 완료', { src });
        };

        if (!existingScript) {
          // 스크립트 동적 로드 (기본 CDN → 실패 시 대체 CDN)
          attachScript(primarySrc);
        } else {
          logger.info('[3/7] 카카오 SDK 스크립트 태그가 이미 존재합니다. 로드 대기 중...');
          
          // 스크립트가 이미 로드되었는지 확인
          const readyState = (existingScript as unknown as { readyState?: string }).readyState;
          if (readyState === 'complete' || readyState === 'loaded') {
            logger.info('[3/7] 스크립트가 이미 로드 완료 상태입니다.');
          }
        }
        
        logger.info('[3/7] 카카오 SDK 로드 대기 중...');
        await new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = isMobile ? 200 : 150; // 모바일: 20초, 데스크톱: 15초
          const checkInterval = setInterval(() => {
            attempts++;
            if (window.Kakao && typeof window.Kakao.init === 'function' && typeof window.Kakao.isInitialized === 'function') {
              clearInterval(checkInterval);
              logger.info(`[3/7] 카카오 SDK 로드 완료 (시도 횟수: ${attempts}, 모바일: ${isMobile})`);
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              const errorMessage = isMobile
                ? '카카오 SDK를 불러올 수 없습니다. 모바일 네트워크 연결을 확인하고 Wi-Fi로 전환하거나 페이지를 새로고침해주세요.'
                : '카카오 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하고 페이지를 새로고침해주세요.';
              logger.error(`[3/7] 카카오 SDK 로드 시간 초과 (시도 횟수: ${attempts}, 모바일: ${isMobile}):`, {
                userAgent: navigator.userAgent,
                networkType: (navigator as any).connection?.effectiveType || 'unknown',
              });
              reject(new Error(errorMessage));
            } else if (attempts % 20 === 0) {
              logger.debug(`[3/7] SDK 로드 대기 중... (${attempts}/${maxAttempts}, 모바일: ${isMobile})`);
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
      const hasAuthorize = !!(window.Kakao.Auth && typeof window.Kakao.Auth.authorize === 'function');
      const hasLogin = !!(window.Kakao.Auth && typeof window.Kakao.Auth.login === 'function');
      logger.debug('[5/7] API 상태:', {
        hasAuth: !!window.Kakao.Auth,
        hasAuthorizeFunction: hasAuthorize,
        hasLoginFunction: hasLogin,
        hasGetAccessToken: !!(window.Kakao.Auth && typeof window.Kakao.Auth.getAccessToken === 'function'),
      });

      if (!window.Kakao.Auth || (!hasAuthorize && !hasLogin)) {
        logger.error('[5/7] 카카오 로그인 API 사용 불가');
        throw new Error('카카오 로그인 API를 사용할 수 없습니다. 페이지를 새로고침해주세요.');
      }

      // 6. 카카오 로그인 실행
      const loginRequestInfo = {
        origin: window.location.origin,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50),
        appKey: `${kakaoAppKey.substring(0, 8)}...`,
        timestamp: new Date().toISOString(),
      };
      
      logger.info('[6/7] 카카오 로그인 요청 시작', loginRequestInfo);
      logger.info('[6/7] ⚠️ 중요: 카카오 개발자 콘솔에서 다음을 확인하세요:', {
        '1. 앱 상태': '앱 설정 → 앱 상태가 "서비스 중" 또는 "개발 중"인지 확인',
        '2. 웹 플랫폼': `앱 설정 → 플랫폼 → Web 플랫폼에 "${window.location.origin}" 등록되어 있는지 확인`,
        '3. 카카오 로그인 활성화': '제품 설정 → 카카오 로그인 → 활성화 설정이 "활성화"인지 확인',
        '4. Redirect URI': `제품 설정 → 카카오 로그인 → Redirect URI에 "${window.location.origin}" 등록되어 있는지 확인`,
        '5. 설정 반영 시간': '설정 저장 후 5-10분 대기 필요',
      });

      // Kakao SDK 2.5.0 이상에서는 authorize 사용 (리다이렉트 방식)
      if (hasAuthorize) {
        logger.info('[6/7] 카카오 로그인 요청 시작 (authorize 방식)', loginRequestInfo);
        const redirectUri = `${window.location.origin}/login`;
        window.Kakao.Auth.authorize({
          redirectUri,
          scope: 'profile_nickname,account_email',
          throughTalk: false,
        });
        // authorize는 리다이렉트 방식이므로 여기서 종료
        return null;
      }

      // 구버전 SDK 호환 (login 방식)
      await new Promise<void>((resolve, reject) => {
        if (!hasLogin) {
          reject(new Error('카카오 로그인 API를 사용할 수 없습니다. SDK 버전을 확인해주세요.'));
          return;
        }

        window.Kakao.Auth.login({
          success: (authObj) => {
            logger.info('[6/7] 카카오 로그인 성공:', {
              hasAuthObj: !!authObj,
              authObjKeys: authObj ? Object.keys(authObj) : [],
            });
            resolve();
          },
          fail: (err) => {
            // 401 Unauthorized 오류 상세 분석
            const errorDetails = {
              error: err,
              errorCode: err?.error,
              errorDescription: err?.error_description,
              errorMsg: err?.msg,
              fullError: JSON.stringify(err, null, 2),
              origin: window.location.origin,
              url: window.location.href,
              appKey: `${kakaoAppKey.substring(0, 8)}...`,
            };

            // 401 오류인 경우 추가 정보 제공
            if (err?.error === 'KOE009' || err?.error_description?.includes('401') || err?.error_description?.includes('Unauthorized')) {
              logger.error('[6/7] ❌ 401 Unauthorized / KOE009 오류 발생:', errorDetails);
              logger.error('[6/7] 🔧 해결 방법:', {
                '1단계': '카카오 개발자 콘솔(https://developers.kakao.com/) 접속',
                '2단계': '내 애플리케이션 → 해당 앱 선택',
                '3단계': '앱 설정 → 앱 상태 → "서비스 시작" 클릭 (가장 중요!)',
                '4단계': `앱 설정 → 플랫폼 → Web 플랫폼에 "${window.location.origin}" 등록`,
                '5단계': '제품 설정 → 카카오 로그인 → 활성화 설정 → "활성화" 확인',
                '6단계': `제품 설정 → 카카오 로그인 → Redirect URI에 "${window.location.origin}" 등록`,
                '7단계': '모든 설정 저장 후 5-10분 대기',
                '8단계': '브라우저 캐시 삭제 후 재시도',
              });
            } else {
              logger.error('[6/7] 카카오 로그인 실패:', errorDetails);
            }
            
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
      const onboardingCompleted = await refreshOnboardingStatus(response.user.id);
      
      const elapsedTime = Date.now() - startTime;
      logger.info(`=== 카카오 로그인 완료 (소요 시간: ${elapsedTime}ms) ===`);
      
      toast.success('카카오 로그인되었습니다.');
      return onboardingCompleted;
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
  }, [refreshOnboardingStatus]);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    try {
      const response = await authApi.loginWithGoogle({ accessToken });
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
  }, []);

  // isAuthenticated 계산값 메모이제이션
  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  // 컨텍스트 값 메모이제이션 - user, token, isLoading이 변경될 때만 재생성
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

