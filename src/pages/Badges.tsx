import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Award, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/lib/api';
import { UserLevel } from '@/types';
import { ALL_BADGES, LEVEL_CATEGORIES } from '@/constants/badges';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export function Badges() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnearned, setShowUnearned] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    usersApi
      .getLevel(user.id)
      .then(setUserLevel)
      .catch(() => toast.error('뱃지 정보를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
        <Award className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">로그인하면 뱃지와 레벨을 확인할 수 있어요.</p>
        <Button onClick={() => navigate('/login')}>로그인</Button>
      </div>
    );
  }

  const earnedIds = new Set(userLevel?.badges.map((b) => b.id) ?? []);
  const earnedBadges = ALL_BADGES.filter((b) => earnedIds.has(b.id));
  const unearnedBadges = ALL_BADGES.filter((b) => !earnedIds.has(b.id));

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-muted" aria-label="뒤로가기">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">뱃지 & 레벨</h1>
      </div>

      {/* Level Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">내 레벨</h2>
        <div className="grid gap-3">
          {LEVEL_CATEGORIES.map(({ key, label, tiers }) => {
            const info = userLevel?.[key];
            if (!info) return null;
            const progressPercent =
              info.nextThreshold !== null && info.nextThreshold > 0
                ? Math.round((info.count / info.nextThreshold) * 100)
                : 100;

            const currentTier = tiers.find((t) => t.level === info.level);

            return (
              <div key={key} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-primary">{info.name}</span>
                    <span className="text-xs text-muted-foreground">Lv.{info.level}</span>
                  </div>
                </div>
                {currentTier && (
                  <p className="text-xs text-muted-foreground">{currentTier.description}</p>
                )}
                <Progress value={Math.min(progressPercent, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{info.count}개</span>
                  {info.nextThreshold !== null ? (
                    <span>다음 레벨: {info.nextThreshold}개</span>
                  ) : (
                    <span>최고 레벨 달성!</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {tiers.map((tier) => (
                    <div
                      key={tier.level}
                      className={cn(
                        'flex items-center gap-2 text-xs px-2 py-1.5 rounded',
                        info.level >= tier.level
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <span className="shrink-0 w-16">Lv.{tier.level} {tier.name}</span>
                      <span className="shrink-0 text-muted-foreground font-normal">
                        {tier.threshold > 0 ? `${tier.threshold}개 이상` : '시작'}
                      </span>
                      <span className="text-muted-foreground/70 font-normal ml-auto text-right">{tier.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Earned Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          보유 뱃지 ({earnedBadges.length}/{ALL_BADGES.length})
        </h2>
        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                data-testid="badge-earned"
                className="rounded-xl border border-primary/30 bg-card p-4 flex flex-col items-center gap-2 text-center"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{badge.name}</span>
                <span className="text-xs text-muted-foreground">{badge.threshold}</span>
                <span className="text-xs text-muted-foreground/70">{badge.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">아직 획득한 뱃지가 없어요</p>
        )}
      </section>

      {/* Unearned Badges - Toggle */}
      {unearnedBadges.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setShowUnearned((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <span>미보유 뱃지 ({unearnedBadges.length})</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showUnearned && 'rotate-180')} />
          </button>
          {showUnearned && (
            <div className="grid grid-cols-2 gap-3">
              {unearnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  data-testid="badge-locked"
                  className="rounded-xl border border-transparent bg-muted/30 p-4 flex flex-col items-center gap-2 text-center opacity-60"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{badge.name}</span>
                  <span className="text-xs text-muted-foreground">{badge.threshold}</span>
                  <span className="text-xs text-muted-foreground/70">{badge.description}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
