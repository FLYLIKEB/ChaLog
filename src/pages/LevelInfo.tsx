import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../lib/api';
import { UserLevel } from '../types';
import { useEffect, useState } from 'react';
import { Loader2, Trophy, Award } from 'lucide-react';
import { cn } from '../components/ui/utils';

const NOTE_TIERS = [
  { level: 1, name: '입문', threshold: 0, desc: '차록 여정의 시작' },
  { level: 2, name: '수련', threshold: 5, desc: '꾸준히 기록하는 중' },
  { level: 3, name: '숙련', threshold: 20, desc: '차에 대한 깊은 이해' },
  { level: 4, name: '마스터', threshold: 50, desc: '차록의 달인' },
];

const POST_TIERS = [
  { level: 1, name: '새싹', threshold: 0, desc: '차담의 시작' },
  { level: 2, name: '이웃', threshold: 5, desc: '활발한 소통' },
  { level: 3, name: '단골', threshold: 20, desc: '차담의 핵심 멤버' },
  { level: 4, name: '터줏대감', threshold: 50, desc: '모두가 아는 존재' },
];

const CELLAR_TIERS = [
  { level: 1, name: '비어있음', threshold: 0, desc: '찻장을 채워보세요' },
  { level: 2, name: '소장가', threshold: 5, desc: '소중한 컬렉션' },
  { level: 3, name: '수집가', threshold: 15, desc: '다양한 차 보유' },
  { level: 4, name: '다완장', threshold: 30, desc: '최고의 찻장' },
];

const BADGE_LIST = [
  { id: 'first_note', name: '첫 차록', condition: '차록 1개 작성' },
  { id: 'note_10', name: '차록 10개', condition: '차록 10개 달성' },
  { id: 'note_50', name: '차록 50개', condition: '차록 50개 달성' },
  { id: 'first_post', name: '첫 게시글', condition: '게시글 1개 작성' },
  { id: 'cellar_10', name: '찻장 10개', condition: '찻장 아이템 10개' },
  { id: 'variety_5', name: '다양한 차 경험', condition: '5종류 이상 차 기록' },
];

function LevelTierList({
  title,
  tiers,
  currentLevel,
  count,
}: {
  title: string;
  tiers: typeof NOTE_TIERS;
  currentLevel: number;
  count: number;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-1">
        {tiers.map((tier) => {
          const isActive = tier.level === currentLevel;
          const isAchieved = tier.level <= currentLevel;
          return (
            <div
              key={tier.level}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive ? 'bg-primary/10 border border-primary/20' : 'bg-muted/20',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                isAchieved ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {tier.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                    {tier.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{tier.threshold}개 이상</span>
                </div>
                <p className="text-xs text-muted-foreground">{tier.desc}</p>
              </div>
              {isActive && (
                <span className="text-xs text-primary font-medium shrink-0">{count}개</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LevelInfo() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    usersApi.getLevel(user.id)
      .then(setUserLevel)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <Header title="레벨 & 뱃지" showBack />
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const earnedBadgeIds = new Set(userLevel?.badges.map(b => b.id) ?? []);

  return (
    <div className="min-h-screen pb-20">
      <Header title="레벨 & 뱃지" showBack />

      <div className="px-4 py-5 space-y-6">
        {/* Levels */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">레벨</h2>
          </div>

          <LevelTierList
            title="차록"
            tiers={NOTE_TIERS}
            currentLevel={userLevel?.noteLevel.level ?? 1}
            count={userLevel?.noteLevel.count ?? 0}
          />
          <LevelTierList
            title="게시글"
            tiers={POST_TIERS}
            currentLevel={userLevel?.postLevel.level ?? 1}
            count={userLevel?.postLevel.count ?? 0}
          />
          <LevelTierList
            title="찻장"
            tiers={CELLAR_TIERS}
            currentLevel={userLevel?.cellarLevel.level ?? 1}
            count={userLevel?.cellarLevel.count ?? 0}
          />
        </section>

        {/* Badges */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">뱃지</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {BADGE_LIST.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-3 rounded-lg border',
                    earned
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/20 border-border/40 opacity-50',
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    earned ? 'bg-primary/15' : 'bg-muted',
                  )}>
                    <Award className={cn('w-4 h-4', earned ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-medium', earned ? 'text-foreground' : 'text-muted-foreground')}>
                      {badge.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{badge.condition}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
