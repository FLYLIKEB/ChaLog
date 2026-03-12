import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Loader2, ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { authApi } from '../lib/api';
import { toast } from 'sonner';

export function FindEmail() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ maskedEmail: string | null; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authApi.findEmail(name.trim());
      setResult(response);
    } catch {
      toast.error('아이디 찾기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showBack title="아이디 찾기" showProfile />

      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">아이디 찾기</h1>
            <p className="text-gray-600 text-sm">
              가입 시 등록한 이름을 입력하시면 이메일을 안내해드립니다.
            </p>
          </div>

          {result ? (
            <div className="space-y-4">
              {result.maskedEmail ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-1">가입된 이메일을 찾았습니다</p>
                  <p>
                    가입된 이메일: <span className="font-semibold">{result.maskedEmail}</span>
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 rounded-lg p-4 text-sm">
                  <p>{result.message}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    로그인으로 돌아가기
                  </Button>
                </Link>
                <Link to="/forgot-password">
                  <Button variant="ghost" className="w-full text-sm text-emerald-600">
                    비밀번호 찾기
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="가입 시 등록한 이름을 입력하세요"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    찾는 중...
                  </>
                ) : (
                  '아이디 찾기'
                )}
              </Button>

              <div className="text-center text-sm space-x-4">
                <Link to="/login" className="text-emerald-600 hover:underline">
                  로그인으로 돌아가기
                </Link>
                <span className="text-gray-400">·</span>
                <Link to="/forgot-password" className="text-emerald-600 hover:underline">
                  비밀번호 찾기
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
