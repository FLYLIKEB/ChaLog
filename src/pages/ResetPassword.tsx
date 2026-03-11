import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { authApi } from '../lib/api';
import { toast } from 'sonner';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('유효하지 않은 재설정 링크입니다.');
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      toast.error('비밀번호는 영문과 숫자를 포함해야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.resetPassword(token!, newPassword);
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      navigate('/login', { replace: true });
    } catch (error: any) {
      const message = error?.response?.data?.message || '비밀번호 재설정에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen">
      <Header showBack title="비밀번호 재설정" showProfile />

      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">새 비밀번호 설정</h1>
            <p className="text-gray-600 text-sm">
              새로운 비밀번호를 입력해주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="영문+숫자 포함 8자 이상"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  변경 중...
                </>
              ) : (
                '비밀번호 변경'
              )}
            </Button>

            <div className="text-center text-sm">
              <Link to="/login" className="text-emerald-600 hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
