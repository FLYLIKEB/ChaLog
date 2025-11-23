import React from 'react';
import { LogOut, Shield, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function Settings() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack title="설정" />
        <div className="p-4">
          <div className="bg-white rounded-lg p-4 space-y-4">
            <p className="text-gray-600">로그인이 필요합니다.</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              로그인하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack title="설정" />
      
      <div className="p-4 space-y-6">
        {/* 프로필 섹션 */}
        <section className="bg-white rounded-lg p-4">
          <h3 className="mb-4">프로필</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">이름</p>
              <p>{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">이메일</p>
              <p>{user.email}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* 정책 안내 섹션 */}
        <section className="bg-white rounded-lg p-4">
          <h3 className="mb-4">약관 및 정책</h3>
          <div className="space-y-2">
            <button 
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => toast.info('준비 중입니다.')}
            >
              <Shield className="w-5 h-5 text-gray-500" />
              <span>개인정보 처리방침</span>
            </button>
            <button 
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => toast.info('준비 중입니다.')}
            >
              <FileText className="w-5 h-5 text-gray-500" />
              <span>서비스 이용약관</span>
            </button>
          </div>
        </section>

        {/* 로그아웃 버튼 */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
