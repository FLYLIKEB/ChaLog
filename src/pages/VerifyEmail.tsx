import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { authApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated } = useAuth();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      setIsVerifying(true);
      try {
        await authApi.verifyEmail(token);
        toast.success('이메일 인증이 완료되었습니다.');
        navigate('/', { replace: true });
      } catch (error: unknown) {
        const err = error as { message?: string };
        setVerifyError(err.message || '이메일 인증에 실패했습니다.');
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [token, navigate]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification();
      toast.success('인증 메일이 재발송되었습니다. 이메일을 확인해주세요.');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || '재발송에 실패했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen">
        <Header showBack title="이메일 인증" showProfile />
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">이메일 인증 중...</p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen">
        <Header showBack title="이메일 인증" showProfile />
        <div className="p-4 sm:max-w-md sm:mx-auto">
          <div className="bg-card rounded-lg p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <Mail className="w-12 h-12 text-destructive" />
              <h1 className="text-xl font-bold">인증 실패</h1>
              <p className="text-muted-foreground text-sm">{verifyError}</p>
            </div>
            {isAuthenticated ? (
              <Button onClick={handleResend} className="w-full" disabled={isResending}>
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  '인증 메일 재발송'
                )}
              </Button>
            ) : (
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/login" className="text-emerald-600 hover:underline">로그인</Link> 후 재발송할 수 있습니다.
              </p>
            )}
            <div className="text-center text-sm">
              <Link to="/login" className="text-emerald-600 hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="이메일 인증" showProfile />
      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mail className="w-12 h-12 text-primary" />
            <h1 className="text-xl font-bold">이메일 인증 메일을 확인해주세요</h1>
            <p className="text-muted-foreground text-sm">
              가입하신 이메일로 인증 링크를 발송했습니다.
              <br />
              이메일을 확인하여 인증을 완료해주세요.
            </p>
          </div>
          {isAuthenticated ? (
            <Button onClick={handleResend} variant="outline" className="w-full" disabled={isResending}>
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                '인증 메일 재발송'
              )}
            </Button>
          ) : (
            <p className="text-sm text-center text-muted-foreground">
              <Link to="/login" className="text-emerald-600 hover:underline">로그인</Link> 후 재발송할 수 있습니다.
            </p>
          )}
          <div className="text-center text-sm">
            <Link to="/" className="text-emerald-600 hover:underline">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
