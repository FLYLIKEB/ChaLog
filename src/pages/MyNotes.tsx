import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function MyNotes() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      navigate('/login');
      return;
    }

    // 내 프로필 페이지로 리다이렉트
    navigate(`/user/${user.id}`, { replace: true });
  }, [isAuthenticated, user, navigate]);

  // 리다이렉트 중 로딩 표시
  return (
    <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
