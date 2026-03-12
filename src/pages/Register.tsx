import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

function getPasswordStrength(pw: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string } {
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const isLong = pw.length >= 12;

  if (pw.length === 0) return { level: 'weak', label: '', color: '' };
  if (pw.length < 8 || !hasLetter || !hasNumber) return { level: 'weak', label: '약함', color: 'bg-red-500' };
  if (hasLetter && hasNumber && hasSpecial && isLong) return { level: 'strong', label: '강함', color: 'bg-green-500' };
  return { level: 'medium', label: '보통', color: 'bg-yellow-500' };
}

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    if (password.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error('비밀번호는 영문자와 숫자를 모두 포함해야 합니다.');
      return;
    }

    if (password.length > 72) {
      toast.error('비밀번호는 최대 72자 이하여야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setIsLoading(true);
      const onboardingCompleted = await register(email, name, password);
      const shouldGoOnboarding = onboardingCompleted === false || onboardingCompleted === null;
      navigate(shouldGoOnboarding ? '/onboarding' : '/');
    } catch (error) {
      // 에러는 AuthContext에서 이미 처리됨
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showBack title="회원가입" showProfile />

      <div className="p-4 sm:max-w-md sm:mx-auto">
        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">회원가입</h1>
            <p className="text-gray-600 text-sm">
              새로운 계정을 만들어보세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

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
                  placeholder="최소 8자, 영문+숫자 포함"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {(['weak', 'medium', 'strong'] as const).map((level, i) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          strength.level === 'weak' && i === 0 ? 'bg-red-500' :
                          strength.level === 'medium' && i <= 1 ? 'bg-yellow-500' :
                          strength.level === 'strong' ? 'bg-green-500' :
                          'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className={`text-xs font-medium ${
                      strength.level === 'weak' ? 'text-red-500' :
                      strength.level === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      비밀번호 강도: {strength.label}
                    </p>
                  )}
                </div>
              )}
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
                  가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-600">이미 계정이 있으신가요? </span>
            <Link to="/login" className="text-emerald-600 hover:underline">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
