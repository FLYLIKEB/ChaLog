import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithKakao, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
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
      // 인증 코드가 있고 아직 처리되지 않은 경우에만 처리
      handleKakaoCallback(code);
    }
  }, [searchParams, navigate, handleKakaoCallback]);

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
            disabled={isLoading || isKakaoLoading}
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

