import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { authApi } from '../lib/api';
import { toast } from 'sonner';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.forgotPassword(email);
      setIsSent(true);
    } catch {
      // 보안상 항상 성공 메시지 표시
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showBack title="비밀번호 찾기" showProfile />

      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">비밀번호 찾기</h1>
            <p className="text-gray-600 text-sm">
              가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </p>
          </div>

          {isSent ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg p-4 text-sm">
                <p className="font-medium mb-1">이메일을 확인해주세요</p>
                <p>
                  입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다.
                  이메일이 도착하지 않는 경우, 스팸 폴더를 확인해주세요.
                </p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  로그인으로 돌아가기
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="가입한 이메일을 입력하세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  '재설정 링크 발송'
                )}
              </Button>

              <div className="text-center text-sm">
                <Link to="/login" className="text-emerald-600 hover:underline">
                  로그인으로 돌아가기
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
