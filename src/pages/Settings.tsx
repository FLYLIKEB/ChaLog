import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Shield, FileText, Bell, ChevronRight, Link2, Loader2, Sun, Moon, Monitor, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useTheme } from 'next-themes';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { usersApi, authApi, LinkedAccount } from '../lib/api';
import { BottomNav } from '../components/BottomNav';

const PROVIDER_LABELS: Record<string, string> = {
  email: '이메일',
  kakao: '카카오',
  google: '구글',
};

function ThemeSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">테마</h3>
      <ToggleGroup
        type="single"
        value={theme ?? 'system'}
        onValueChange={(v) => v && setTheme(v)}
        variant="outline"
        className="w-full grid grid-cols-3"
      >
        <ToggleGroupItem value="light" aria-label="라이트 모드" className="flex flex-col gap-1 py-3">
          <Sun className="w-4 h-4" />
          <span className="text-xs">라이트</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="다크 모드" className="flex flex-col gap-1 py-3">
          <Moon className="w-4 h-4" />
          <span className="text-xs">다크</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="system" aria-label="시스템 설정 따르기" className="flex flex-col gap-1 py-3">
          <Monitor className="w-4 h-4" />
          <span className="text-xs">시스템</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </Card>
  );
}

export function Settings() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean | null>(null);
  const [isNotificationLoaded, setIsNotificationLoaded] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState<boolean>(true);
  const [isProfilePublicLoading, setIsProfilePublicLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [linkedAccountsLoaded, setLinkedAccountsLoaded] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [linkKakaoLoading, setLinkKakaoLoading] = useState(false);
  const [linkGoogleLoading, setLinkGoogleLoading] = useState(false);

  const fetchLinkedAccounts = useCallback(async () => {
    if (!user) return;
    try {
      const accounts = await usersApi.getLinkedAccounts(user.id);
      setLinkedAccounts(accounts);
    } catch {
      setLinkedAccounts([]);
    } finally {
      setLinkedAccountsLoaded(true);
    }
  }, [user]);

  const fetchNotificationSetting = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const setting = await usersApi.getNotificationSetting(userId);
      setIsNotificationEnabled(setting.isNotificationEnabled);
    } catch {
      // ignore
    } finally {
      setIsNotificationLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotificationSetting();
  }, [user?.id, fetchNotificationSetting]);

  useEffect(() => {
    if (user?.isProfilePublic !== undefined) {
      setIsProfilePublic(user.isProfilePublic);
    }
  }, [user?.isProfilePublic]);

  useEffect(() => {
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

  // 카카오 연동 콜백 처리 (redirect 후 /settings?code=xxx&state=link_kakao)
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || state !== 'link_kakao' || !user) return;

    const run = async () => {
      setLinkKakaoLoading(true);
      try {
        const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
        if (!kakaoAppKey) throw new Error('카카오 앱 키가 설정되지 않았습니다.');
        const redirectUri = `${window.location.origin}/settings`;
        const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: kakaoAppKey,
            redirect_uri: redirectUri,
            code,
          }),
        });
        if (!tokenResponse.ok) {
          const err = await tokenResponse.json().catch(() => ({}));
          throw new Error(err.error_description || '토큰 교환 실패');
        }
        const { access_token } = await tokenResponse.json();
        await authApi.linkKakao(access_token);
        await fetchLinkedAccounts();
        setSearchParams({}, { replace: true });
        toast.success('카카오 계정이 연동되었습니다.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '카카오 연동에 실패했습니다.');
        setSearchParams({}, { replace: true });
      } finally {
        setLinkKakaoLoading(false);
      }
    };
    run();
  }, [searchParams, user, fetchLinkedAccounts, setSearchParams]);

  const handleLinkGoogleSuccess = useCallback(
    async (accessToken: string) => {
      try {
        setLinkGoogleLoading(true);
        await authApi.linkGoogle(accessToken);
        await fetchLinkedAccounts();
        toast.success('구글 계정이 연동되었습니다.');
      } catch (e) {
        toast.error(e && typeof e === 'object' && 'message' in e ? String((e as any).message) : '구글 연동에 실패했습니다.');
      } finally {
        setLinkGoogleLoading(false);
      }
    },
    [fetchLinkedAccounts],
  );

  const googleLinkLogin = useGoogleLogin({
    onSuccess: (res) => handleLinkGoogleSuccess(res.access_token),
    onError: () => {
      toast.error('구글 로그인에 실패했습니다.');
      setLinkGoogleLoading(false);
    },
  });

  const handleLinkKakao = () => {
    const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
    if (!kakaoAppKey) {
      toast.error('카카오 앱 키가 설정되지 않았습니다.');
      return;
    }
    if (!window.Kakao?.Auth?.authorize) {
      toast.error('카카오 SDK를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }
    setLinkKakaoLoading(true);
    window.Kakao.Auth.authorize({
      redirectUri: `${window.location.origin}/settings`,
      scope: 'profile_nickname,account_email',
      state: 'link_kakao',
    });
  };

  const handleLinkGoogle = () => {
    setLinkGoogleLoading(true);
    googleLinkLogin();
  };

  const handleUnlink = async (auth: LinkedAccount) => {
    if (!user) return;
    if (linkedAccounts.length <= 1) {
      toast.error('최소 1개의 로그인 수단은 유지해야 합니다.');
      return;
    }
    setUnlinkingId(auth.id);
    try {
      await usersApi.unlinkAccount(user.id, auth.id);
      await fetchLinkedAccounts();
      toast.success(`${PROVIDER_LABELS[auth.provider] || auth.provider} 연동이 해제되었습니다.`);
    } catch (e) {
      toast.error(e && typeof e === 'object' && 'message' in e ? String((e as any).message) : '연동 해제에 실패했습니다.');
    } finally {
      setUnlinkingId(null);
    }
  };

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

  const handleProfilePublicToggle = async (checked: boolean) => {
    if (!user) return;
    setIsProfilePublicLoading(true);
    try {
      await usersApi.updateProfile(user.id, { isProfilePublic: checked });
      setIsProfilePublic(checked);
      toast.success(checked ? '프로필이 공개되었습니다.' : '프로필이 비공개로 설정되었습니다.');
    } catch {
      toast.error('프로필 공개 설정 변경에 실패했습니다.');
    } finally {
      setIsProfilePublicLoading(false);
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
      <div className="min-h-screen pb-20">
        <Header showBack title="설정" showProfile />
        <div className="p-4 sm:p-6 space-y-4">
          {/* 테마 - 비로그인 사용자도 전환 가능 */}
          <ThemeSection />
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
    <div className="min-h-screen pb-20">
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

        {/* 테마 */}
        <ThemeSection />

        {/* 어드민 페이지 (관리자만) */}
        {isAdmin && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">운영</h3>
            <Link
              to="/admin"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">어드민 페이지</p>
                  <p className="text-xs text-muted-foreground mt-0.5">대시보드, 신고 관리, 모니터링</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          </Card>
        )}

        {/* 계정 연동 */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">계정 연동</h3>
          <div className="space-y-2">
            {!linkedAccountsLoaded ? (
              <div className="flex items-center gap-2 p-3 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">연동 계정 불러오는 중...</span>
              </div>
            ) : (
              <>
                {['email', 'kakao', 'google'].map((provider) => {
                  const linked = linkedAccounts.find((a) => a.provider === provider);
                  const label = PROVIDER_LABELS[provider] || provider;
                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Link2 className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          {linked ? (
                            <p className="text-xs text-muted-foreground">
                              {provider === 'email'
                                ? `${linked.providerId}${linked.hasCredential ? ' · 비밀번호 설정됨' : ''}`
                                : '연동됨'}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">미연동</p>
                          )}
                        </div>
                      </div>
                      {linked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={linkedAccounts.length <= 1 || unlinkingId === linked.id}
                          onClick={() => handleUnlink(linked)}
                          title={
                            linkedAccounts.length <= 1
                              ? '최소 1개의 로그인 수단은 유지해야 합니다'
                              : undefined
                          }
                        >
                          {unlinkingId === linked.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            '해제'
                          )}
                        </Button>
                      ) : provider === 'kakao' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={linkKakaoLoading || linkGoogleLoading}
                          onClick={handleLinkKakao}
                        >
                          {linkKakaoLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            '연동'
                          )}
                        </Button>
                      ) : provider === 'google' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={linkKakaoLoading || linkGoogleLoading}
                          onClick={handleLinkGoogle}
                        >
                          {linkGoogleLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            '연동'
                          )}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </>
            )}
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
                <p className="text-xs text-muted-foreground mt-0.5">좋아요, 댓글, 구독 알림</p>
              </div>
            </div>
            <Switch
              checked={isNotificationEnabled ?? false}
              onCheckedChange={handleNotificationToggle}
              disabled={!isNotificationLoaded || isNotificationLoading}
            />
          </div>
        </Card>

        {/* 개인정보 */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">개인정보</h3>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">프로필 공개</p>
                <p className="text-xs text-muted-foreground mt-0.5">다른 사용자가 내 프로필을 볼 수 있어요</p>
              </div>
            </div>
            <Switch
              checked={isProfilePublic}
              onCheckedChange={handleProfilePublicToggle}
              disabled={isProfilePublicLoading}
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
