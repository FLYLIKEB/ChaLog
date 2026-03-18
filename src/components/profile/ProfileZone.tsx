import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FollowersDrawer } from './FollowersDrawer';
import { Camera, ChevronRight, Globe, Instagram, Loader2, Pencil } from 'lucide-react';
import { User, UserLevel, UserOnboardingPreference } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import { TEA_TYPE_COLORS, TEA_TYPES } from '@/constants';

interface ProfileStatsData {
  averageRating: number;
  totalLikes: number;
}

interface ProfileZoneProps {
  user: User;
  isOwnProfile: boolean;
  isFollowLoading: boolean;
  noteCount: number;
  stats: ProfileStatsData;
  userLevel: UserLevel | null;
  onboardingPreference: UserOnboardingPreference | null;
  onFollowToggle: () => void;
  onEditImage: () => void;
  onEditProfile: () => void;
  onEditPreference: () => void;
}

export function ProfileZone({
  user,
  isOwnProfile,
  isFollowLoading,
  noteCount,
  stats,
  userLevel,
  onboardingPreference,
  onFollowToggle,
  onEditImage,
  onEditProfile,
  onEditPreference,
}: ProfileZoneProps) {
  const navigate = useNavigate();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const bioIsLong = (user.bio?.length ?? 0) > 80;

  const noteLevel = userLevel?.noteLevel;
  const levelProgress = noteLevel?.nextThreshold != null
    ? Math.min(100, Math.round((noteLevel.count / noteLevel.nextThreshold) * 100))
    : 100;
  const remaining = noteLevel?.nextThreshold != null
    ? Math.max(0, noteLevel.nextThreshold - noteLevel.count)
    : 0;

  const hasPrefs = onboardingPreference && (
    onboardingPreference.preferredTeaTypes.length > 0 ||
    onboardingPreference.preferredFlavorTags.length > 0
  );
  const teaTypes = [...(onboardingPreference?.preferredTeaTypes ?? [])].sort((a, b) => {
    const ia = TEA_TYPES.indexOf(a as (typeof TEA_TYPES)[number]);
    const ib = TEA_TYPES.indexOf(b as (typeof TEA_TYPES)[number]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const flavorTags = onboardingPreference?.preferredFlavorTags ?? [];
  const visibleTeaTypes = teaTypes.slice(0, 3);
  const visibleFlavors = flavorTags.slice(0, 3);
  const overflow = (teaTypes.length + flavorTags.length) - (visibleTeaTypes.length + visibleFlavors.length);

  return (
    <div>
      {/* Gradient banner */}
      <div className="h-16 bg-gradient-to-br from-primary/8 via-amber-50/30 to-transparent dark:from-primary/10 dark:via-stone-900/20 dark:to-transparent" />

      <div className="px-4 -mt-8 pb-4 space-y-3">

        {/* A. Instagram-style: Avatar (left) + Stats (right) */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="ring-2 ring-background rounded-full shadow-sm">
              <UserAvatar
                name={user.name}
                profileImageUrl={user.profileImageUrl}
                size="xl"
                className="!w-[72px] !h-[72px]"
              />
            </div>
            {isOwnProfile && (
              <button
                onClick={onEditImage}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background shadow-sm hover:bg-primary/90 transition-colors"
                aria-label="프로필 사진 수정"
              >
                <Camera className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Stats — right of avatar */}
          <div className="flex-1 flex items-center justify-around pt-6">
            <StatItem value={noteCount} label="차록" />
            <div className="w-px h-6 bg-border/40" />
            <StatItem
              value={stats.averageRating > 0 ? `★${stats.averageRating}` : '—'}
              label="평균 별점"
            />
            <div className="w-px h-6 bg-border/40" />
            <button
              type="button"
              onClick={() => setFollowersOpen(true)}
              className="flex flex-col items-center gap-0.5 hover:opacity-70 transition-opacity"
            >
              <span className="text-[22px] font-bold leading-none text-foreground tracking-tight">
                {(user.followerCount ?? 0).toLocaleString('ko-KR')}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">구독자</span>
            </button>
          </div>
        </div>

        {/* B. Name + social links */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-base text-foreground leading-tight">{user.name}</span>
          {isOwnProfile && (
            <button
              onClick={onEditProfile}
              className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="프로필 편집"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {(user.instagramUrl || user.blogUrl) && (
            <div className="flex items-center gap-1">
              {user.instagramUrl && (
                <a href={user.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="인스타그램">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {user.blogUrl && (
                <a href={user.blogUrl} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="블로그">
                  <Globe className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* C. Bio */}
        {user.bio && (
          <div className="-mt-1">
            <p className={cn(
              'text-sm text-muted-foreground leading-snug',
              !bioExpanded && 'line-clamp-2',
            )}>
              {user.bio}
            </p>
            {bioIsLong && (
              <button
                onClick={() => setBioExpanded(v => !v)}
                className="text-xs text-primary mt-0.5"
              >
                {bioExpanded ? '접기' : '더보기'}
              </button>
            )}
          </div>
        )}

        {/* D. Follow / Edit button */}
        {!isOwnProfile ? (
          <Button
            onClick={onFollowToggle}
            disabled={isFollowLoading}
            variant={user.isFollowing ? 'secondary' : 'default'}
            size="sm"
            className="w-full h-8 text-sm font-semibold rounded-xl"
          >
            {isFollowLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : user.isFollowing ? '구독 중' : '구독'
            }
          </Button>
        ) : null}

        {/* E. Level Progress — Banksalad 스타일 */}
        {userLevel && noteLevel && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => navigate('/badges')}
              className="w-full flex items-center justify-between group"
            >
              <span className="text-xs font-medium text-foreground">
                🍃 차록 Lv.{noteLevel.level} {noteLevel.name}
              </span>
              <div className="flex items-center gap-1">
                {noteLevel.nextThreshold != null ? (
                  <span className="text-xs text-muted-foreground">
                    Lv.{noteLevel.level + 1}까지 {remaining}개
                  </span>
                ) : (
                  <span className="text-xs text-primary font-medium">최고 레벨 달성 🎉</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </div>
            </button>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            {userLevel.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {userLevel.badges.slice(0, 3).map(b => (
                  <span
                    key={b.id}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
                  >
                    {b.name}
                  </span>
                ))}
                {userLevel.badges.length > 3 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{userLevel.badges.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* F. Preference Tags — Fruits Family 스타일 */}
        {hasPrefs && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {visibleTeaTypes.map(tag => {
              const colorClass = tag in TEA_TYPE_COLORS
                ? TEA_TYPE_COLORS[tag as keyof typeof TEA_TYPE_COLORS]
                : undefined;
              return (
                <span
                  key={tag}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 text-xs font-medium text-foreground"
                >
                  {colorClass && (
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colorClass)} />
                  )}
                  {tag}
                </span>
              );
            })}
            {visibleFlavors.map(tag => (
              <span
                key={tag}
                className="shrink-0 px-2.5 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
            {overflow > 0 && (
              isOwnProfile ? (
                <button
                  onClick={onEditPreference}
                  className="shrink-0 px-2 py-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                >
                  +{overflow}
                </button>
              ) : (
                <span className="shrink-0 px-2 py-1 text-xs text-muted-foreground">
                  +{overflow}
                </span>
              )
            )}
            {isOwnProfile && (
              <button
                onClick={onEditPreference}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="취향 수정"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      <FollowersDrawer
        open={followersOpen}
        onOpenChange={setFollowersOpen}
        userId={user.id}
        followerCount={user.followerCount ?? 0}
        followingCount={user.followingCount ?? 0}
      />
    </div>
  );
}

function StatItem({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[22px] font-bold leading-none text-foreground tracking-tight">
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}
