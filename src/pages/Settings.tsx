import React, { useEffect, useState } from 'react';
import { LogOut, Shield, FileText, Bell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { usersApi } from '../lib/api';
import { BottomNav } from '../components/BottomNav';

export function Settings() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean | null>(null);
  const [isNotificationLoaded, setIsNotificationLoaded] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const controller = new AbortController();
    usersApi.getNotificationSetting(userId).then((setting) => {
      if (controller.signal.aborted) return;
      setIsNotificationEnabled(setting.isNotificationEnabled);
      setIsNotificationLoaded(true);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setIsNotificationLoaded(true);
    });
    return () => controller.abort();
  }, [user?.id]);

  const handleNotificationToggle = async (checked: boolean) => {
    if (!user) return;
    setIsNotificationLoading(true);
    try {
      const updated = await usersApi.updateNotificationSetting(user.id, checked);
      setIsNotificationEnabled(updated.isNotificationEnabled);
      toast.success(updated.isNotificationEnabled ? '알림이 켜졌습니다.' : '알림이 꺼졌습니다.');
    } catch {
      setIsNotificationEnabled(!checked);
      toast.error('알림 설정 변경에 실패했습니다.');
    } finally {
      setIsNotificationLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const listItemClass =
    'w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left';

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header showBack title="설정" showProfile />
        <div className="p-4 sm:p-6">
          <Card className="p-6">
            <p className="text-muted-foreground mb-4">로그인이 필요합니다.</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              로그인하기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showBack title="설정" showProfile />

      <div className="p-4 sm:p-6 space-y-4">
        {/* 프로필 */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">프로필</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">이름</p>
              <p className="text-foreground font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">이메일</p>
              <p className="text-foreground">{user.email || '미설정'}</p>
            </div>
          </div>
        </Card>

        {/* 알림 */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">알림</h3>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">앱 알림</p>
                <p className="text-xs text-muted-foreground mt-0.5">좋아요, 댓글, 팔로우 알림</p>
              </div>
            </div>
            <Switch
              checked={isNotificationEnabled ?? false}
              onCheckedChange={handleNotificationToggle}
              disabled={!isNotificationLoaded || isNotificationLoading}
            />
          </div>
        </Card>

        {/* 약관 및 정책 */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">약관 및 정책</h3>
          <div className="space-y-1">
            <button
              className={listItemClass}
              onClick={() => toast.info('준비 중입니다.')}
            >
              <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-foreground">개인정보 처리방침</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <button
              className={listItemClass}
              onClick={() => toast.info('준비 중입니다.')}
            >
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-foreground">서비스 이용약관</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </Card>

        {/* 로그아웃 */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
