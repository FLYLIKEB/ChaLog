import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleLoginButtonProps {
  onSuccess: (accessToken: string) => void;
  disabled: boolean;
  isLoading: boolean;
}

function GoogleLoginButton({ onSuccess, disabled, isLoading }: GoogleLoginButtonProps) {
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => onSuccess(tokenResponse.access_token),
    onError: () => {
      toast.error('구글 로그인에 실패했습니다.');
    },
  });

  return (
    <Button
      type="button"
      onClick={() => googleLogin()}
      disabled={disabled}
      className="w-full bg-white text-[#3c4043] border border-[#dadce0] hover:bg-gray-50"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          로그인 중...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          구글로 로그인
        </>
      )}
    </Button>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithKakao, loginWithGoogle, isAuthenticated, hasCompletedOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const processedCodeRef = useRef<string | null>(null);

  const handleKakaoCallback = useCallback(async (code: string) => {
    // 이미 처리된 코드인지 확인
    if (processedCodeRef.current === code) {
      return;
    }

    try {
      processedCodeRef.current = code;
      setIsKakaoLoading(true);
      // 인증 코드를 사용하여 로그인 처리
      const onboardingCompleted = await loginWithKakao(code);
      
      // null이 반환되면 이미 처리된 코드이지만, 로그인 상태 확인
      if (onboardingCompleted === null) {
        // 사용자가 이미 로그인되어 있다면 홈으로 리다이렉트
        if (isAuthenticated) {
          navigate('/', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
        return;
      }
      
      const shouldGoOnboarding = onboardingCompleted === false;
      // URL에서 code 파라미터 제거하고 이동
      navigate(shouldGoOnboarding ? '/onboarding' : '/', { replace: true });
    } catch (error) {
      // 에러는 AuthContext에서 이미 처리됨
      // 처리 실패 시 processedCode 초기화하여 재시도 가능하도록
      processedCodeRef.current = null;
      // 사용자가 이미 로그인되어 있다면 홈으로 리다이렉트
      if (isAuthenticated) {
        navigate('/', { replace: true });
      } else {
        // URL에서 code 파라미터 제거
        navigate('/login', { replace: true });
      }
    } finally {
      setIsKakaoLoading(false);
    }
  }, [loginWithKakao, navigate, isAuthenticated]);

  // 카카오 로그인 리다이렉트 후 인증 코드 처리
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      toast.error(`카카오 로그인 실패: ${errorDescription || error}`);
      // URL에서 에러 파라미터 제거
      navigate('/login', { replace: true });
      return;
    }

    if (code && code !== processedCodeRef.current) {
      // 이미 로그인된 상태에서 코드가 URL에 남아있는 경우 바로 이동
      if (isAuthenticated) {
        navigate(hasCompletedOnboarding === false ? '/onboarding' : '/', { replace: true });
        return;
      }
      handleKakaoCallback(code);
    }
  }, [searchParams, navigate, handleKakaoCallback, isAuthenticated, hasCompletedOnboarding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      const onboardingCompleted = await login(email, password);
      navigate(onboardingCompleted === false ? '/onboarding' : '/');
    } catch (error) {
      // 에러는 AuthContext에서 이미 처리됨
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setIsKakaoLoading(true);
      const onboardingCompleted = await loginWithKakao();
      if (onboardingCompleted === null) {
        return;
      }
      navigate(onboardingCompleted === false ? '/onboarding' : '/');
    } catch (error) {
      // 에러는 AuthContext에서 이미 처리됨
    } finally {
      setIsKakaoLoading(false);
    }
  };

  const handleGoogleLoginSuccess = useCallback(async (accessToken: string) => {
    try {
      setIsGoogleLoading(true);
      const onboardingCompleted = await loginWithGoogle(accessToken);
      if (onboardingCompleted === null) return;
      navigate(onboardingCompleted === false ? '/onboarding' : '/');
    } catch (error) {
      // 에러는 AuthContext에서 이미 처리됨
    } finally {
      setIsGoogleLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack title="로그인" />
      
      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-white rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">로그인</h1>
            <p className="text-gray-600 text-sm">
              차 기록을 시작해보세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isKakaoLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">또는</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleKakaoLogin}
            disabled={isLoading || isKakaoLoading || isGoogleLoading}
            className="w-full bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90"
          >
            {isKakaoLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3Z" />
                </svg>
                카카오로 로그인
              </>
            )}
          </Button>

          {googleClientId && (
            <GoogleLoginButton
              onSuccess={handleGoogleLoginSuccess}
              disabled={isLoading || isKakaoLoading || isGoogleLoading}
              isLoading={isGoogleLoading}
            />
          )}

          <div className="text-center text-sm">
            <span className="text-gray-600">계정이 없으신가요? </span>
            <Link to="/register" className="text-emerald-600 hover:underline">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
