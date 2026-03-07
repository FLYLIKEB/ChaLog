import React, { useEffect, useState, useCallback } from 'react';
import { LogOut, Shield, FileText, Bell, Link2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { usersApi, authApi, LinkedAccount } from '../lib/api';

const PROVIDER_LABELS: Record<string, string> = {
  email: '이메일',
  kakao: '카카오',
  google: '구글',
};

export function Settings() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean | null>(null);
  const [isNotificationLoaded, setIsNotificationLoaded] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
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
              <p>{user.email || '미설정'}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* 계정 연동 섹션 */}
        <section className="bg-white rounded-lg p-4">
          <h3 className="mb-4">계정 연동</h3>
          <div className="space-y-2">
            {!linkedAccountsLoaded ? (
              <div className="flex items-center gap-2 p-3 text-gray-500">
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
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Link2 className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          {linked ? (
                            <p className="text-xs text-gray-500">
                              {provider === 'email'
                                ? `${linked.providerId}${linked.hasCredential ? ' · 비밀번호 설정됨' : ''}`
                                : '연동됨'}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">미연동</p>
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
        </section>

        <Separator />

        {/* 알림 섹션 */}
        <section className="bg-white rounded-lg p-4">
          <h3 className="mb-4">알림</h3>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">앱 알림</p>
                <p className="text-xs text-gray-500 mt-0.5">좋아요, 댓글, 팔로우 알림</p>
              </div>
            </div>
            <Switch
              checked={isNotificationEnabled ?? false}
              onCheckedChange={handleNotificationToggle}
              disabled={!isNotificationLoaded || isNotificationLoading}
            />
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
