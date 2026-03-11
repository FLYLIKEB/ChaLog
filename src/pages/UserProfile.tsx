import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { BottomNav } from '../components/BottomNav';
import { usersApi, notesApi, followsApi, teasApi } from '../lib/api';
import { User, Note, UserOnboardingPreference, Tea } from '../types';
import { toast } from 'sonner';
import { Loader2, Star, Heart, FileText, Camera, Instagram, Globe, Pencil, Bookmark, BookHeart } from 'lucide-react';
import { logger } from '../lib/logger';
import { UserAvatar } from '../components/ui/UserAvatar';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/card';
import { Section } from '../components/ui/Section';
import { ProfileImageEditModal } from '../components/ProfileImageEditModal';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { OnboardingPreferenceEditModal } from '../components/OnboardingPreferenceEditModal';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { TEA_TYPES, TEA_TYPE_COLORS } from '../constants';
import { cn } from '../components/ui/utils';
import { InfiniteScrollSentinel } from '../components/InfiniteScrollSentinel';

type SortType = 'latest' | 'rating';

export function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const userId = id ? parseInt(id, 10) : NaN;
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortType>('latest');
  const [notePage, setNotePage] = useState(1);
  const [noteTotal, setNoteTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const NOTE_LIMIT = 20;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [isOnboardingEditModalOpen, setIsOnboardingEditModalOpen] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [onboardingPreference, setOnboardingPreference] = useState<UserOnboardingPreference | null>(null);

  const isOwnProfile = !authLoading && currentUser && userId === currentUser.id;
  const [wishlistedTeas, setWishlistedTeas] = useState<Tea[]>([]);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);

  const initialLoadDone = useRef(false);

  const fetchNotes = useCallback(async (sortType: SortType, pageNum = 1, append = false) => {
    if (isNaN(userId)) return;
    const isPublicFilter = isOwnProfile ? undefined : true;
    const result = await notesApi.getAll(userId, isPublicFilter, undefined, undefined, undefined, sortType, pageNum, NOTE_LIMIT);
    if (result && typeof result === 'object' && 'data' in result) {
      const paged = result as { data: Note[]; total: number; page: number; limit: number };
      setNotes(prev => append ? [...prev, ...paged.data] : paged.data);
      setNoteTotal(paged.total);
      setNotePage(paged.page);
    } else {
      const notesArray = Array.isArray(result) ? result : [];
      setNotes(append ? prev => [...prev, ...(notesArray as Note[])] : notesArray as Note[]);
      setNoteTotal(notesArray.length);
    }
  }, [userId, isOwnProfile]);

  const fetchData = useCallback(async () => {
    if (isNaN(userId)) {
      toast.error('유효하지 않은 사용자 ID입니다.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setOnboardingPreference(null);
      const promises: [Promise<unknown>, Promise<void>, Promise<UserOnboardingPreference | null>] = [
        usersApi.getById(userId),
        fetchNotes(sort),
        isOwnProfile
          ? usersApi.getOnboardingPreference(userId).catch((error) => {
              if ((error as { statusCode?: number })?.statusCode !== 404) {
                logger.warn('Failed to fetch onboarding preference:', error);
              }
              return null;
            })
          : Promise.resolve(null),
      ];
      const [userData, , pref] = await Promise.all(promises);
      setUser(userData as User);
      setOnboardingPreference(pref);
      initialLoadDone.current = true;

      if (isOwnProfile) {
        teasApi.getWishlisted().then((teas) => setWishlistedTeas(Array.isArray(teas) ? teas : [])).catch(() => {});
      }
    } catch (error: unknown) {
      logger.error('Failed to fetch user profile:', error);
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 403) {
        setIsPrivateProfile(true);
      } else if (statusCode === 404) {
        toast.error('사용자를 찾을 수 없습니다.');
      } else {
        toast.error('사용자를 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isOwnProfile, sort, fetchNotes]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, fetchData]);

  // 정렬 변경 시 노트만 다시 가져오기 (초기 로드 이후)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setNotePage(1);
    fetchNotes(sort, 1);
  }, [sort, fetchNotes]);

  const hasMore = notes.length < noteTotal;

  const isLoadingMoreRef = useRef(false);
  const notePageRef = useRef(notePage);
  notePageRef.current = notePage;

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      await fetchNotes(sort, notePageRef.current + 1, true);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, sort, fetchNotes]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error('구독하려면 로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!user) return;

    setIsFollowLoading(true);
    const prevIsFollowing = user.isFollowing;
    const delta = prevIsFollowing ? -1 : 1;

    setUser((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !prevIsFollowing,
            followerCount: (prev.followerCount ?? 0) + delta,
          }
        : prev,
    );

    try {
      const result = await followsApi.toggle(userId) as { isFollowing: boolean };
      // optimistic update already adjusted followerCount; only sync isFollowing from server
      setUser((prev) =>
        prev
          ? { ...prev, isFollowing: result.isFollowing }
          : prev,
      );
    } catch (error) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: prevIsFollowing,
              followerCount: (prev.followerCount ?? 0) - delta,
            }
          : prev,
      );
      toast.error('구독 처리 중 오류가 발생했습니다.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (notes.length === 0) {
      return {
        averageRating: 0,
        totalLikes: 0,
        noteCount: 0,
      };
    }

    const averageRating = notes.reduce((sum, note) => sum + (note.overallRating || 0), 0) / notes.length;
    const totalLikes = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0);

    const safeAverageRating = isNaN(averageRating) ? 0 : Number(averageRating.toFixed(1));

    return {
      averageRating: safeAverageRating,
      totalLikes,
      noteCount: noteTotal || notes.length,
    };
  }, [notes, noteTotal]);

  // 서버에서 정렬된 상태로 반환되므로 클라이언트 정렬 불필요
  const sortedNotes = notes;

  const handleProfileImageUpdate = (imageUrl: string) => {
    if (user) {
      setUser({ ...user, profileImageUrl: imageUrl || null });
    }
  };

  const handleProfileInfoUpdate = (updatedFields: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedFields });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <Header
          showBack={!isOwnProfile}
          showProfile={isOwnProfile}
          showLogo={isOwnProfile}
          title={isOwnProfile ? '내 차록' : '사용자 프로필'}
        />
        <div className="p-6 space-y-6">
          {/* 프로필 카드 스켈레톤 */}
          <Card className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </Card>
          {/* 통계 스켈레톤 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-3 flex flex-col items-center gap-1">
                <div className="h-5 w-8 rounded bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
          {/* 노트 리스트 스켈레톤 */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isPrivateProfile) {
    return (
      <div className="min-h-screen pb-20">
        <Header showBack title="사용자 프로필" showProfile />
        <div className="p-4">
          <EmptyState
            type="notes"
            message="비공개 프로필입니다."
            action={{ label: '탐색하기', onClick: () => navigate('/sasaek') }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pb-20">
        <Header showBack title="사용자 프로필" showProfile />
        <div className="p-4">
          <EmptyState
            type="notes"
            message="사용자를 찾을 수 없어요."
            action={{ label: '탐색하기', onClick: () => navigate('/sasaek') }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header
        showBack={!isOwnProfile}
        showProfile={isOwnProfile}
        showLogo={isOwnProfile}
        title={isOwnProfile ? '내 차록' : '사용자 프로필'}
      />

      <div className="p-6 space-y-6">
        {/* 프로필 헤더 섹션 */}
        <Card className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="relative shrink-0">
              <UserAvatar
                name={user.name}
                profileImageUrl={user.profileImageUrl}
                size="md"
              />
              {isOwnProfile && (
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full min-w-[44px] min-h-[44px] w-11 h-11 bg-primary hover:bg-primary/90 shadow-md border-2 border-background"
                  aria-label="프로필 사진 수정"
                >
                  <Camera className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-primary">{user.name}</h2>
                {isOwnProfile && (
                  <Button
                    onClick={() => setIsProfileEditModalOpen(true)}
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="프로필 편집"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {user.bio && (
                <p className="text-sm text-muted-foreground max-w-[240px] leading-snug">{user.bio}</p>
              )}
              {(user.instagramUrl || user.blogUrl) && (
                <div className="flex items-center gap-2">
                  {user.instagramUrl && (
                    <a
                      href={user.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="인스타그램"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {user.blogUrl && (
                    <a
                      href={user.blogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="블로그"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>구독자 {(user.followerCount ?? 0).toLocaleString('ko-KR')}</span>
                <span>구독 {(user.followingCount ?? 0).toLocaleString('ko-KR')}</span>
              </div>
              {!isOwnProfile && !authLoading && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  variant={user.isFollowing ? 'outline' : 'default'}
                  size="sm"
                  className="mt-1 min-w-[88px]"
                >
                  {isFollowLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : user.isFollowing ? (
                    '구독 중'
                  ) : (
                    '구독'
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 프로필 사진 수정 모달 */}
        {isOwnProfile && user && (
          <ProfileImageEditModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            currentImageUrl={user.profileImageUrl}
            onSuccess={handleProfileImageUpdate}
            userId={user.id}
          />
        )}

        {/* 프로필 정보 편집 모달 */}
        {isOwnProfile && user && (
          <ProfileEditModal
            open={isProfileEditModalOpen}
            onOpenChange={setIsProfileEditModalOpen}
            user={user}
            onSuccess={handleProfileInfoUpdate}
          />
        )}

        {/* 통계 카드 섹션 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            icon={Star}
            value={stats.averageRating}
            label="평균 평점"
          />
          <StatCard
            icon={Heart}
            value={stats.totalLikes.toLocaleString('ko-KR')}
            label="총 좋아요"
          />
          <StatCard
            icon={FileText}
            value={stats.noteCount}
            label="작성한 차록"
          />
        </div>

        {/* 취향 정보 섹션 - 내 프로필에서만 표시 */}
        {isOwnProfile && onboardingPreference && (
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">취향</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOnboardingEditModalOpen(true)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                aria-label="취향 수정"
              >
                <Pencil className="w-3 h-3" />
                {onboardingPreference.preferredTeaTypes?.length || onboardingPreference.preferredFlavorTags?.length
                  ? '수정'
                  : '설정'}
              </Button>
            </div>
            {onboardingPreference.preferredTeaTypes?.length > 0 || onboardingPreference.preferredFlavorTags?.length > 0 ? (
              <>
                {onboardingPreference.preferredTeaTypes?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">관심 차종</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(onboardingPreference.preferredTeaTypes)]
                        .sort((a, b) => {
                          const ia = TEA_TYPES.indexOf(a as (typeof TEA_TYPES)[number]);
                          const ib = TEA_TYPES.indexOf(b as (typeof TEA_TYPES)[number]);
                          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                        })
                        .map((tag) => {
                          const colorClass = tag in TEA_TYPE_COLORS ? TEA_TYPE_COLORS[tag as keyof typeof TEA_TYPE_COLORS] : undefined;
                          return (
                            <span key={tag} className="inline-flex items-center gap-1.5">
                              {colorClass && (
                                <span className={cn('w-1.5 h-4 rounded-full shrink-0', colorClass)} aria-hidden />
                              )}
                              <Badge variant="secondary">{tag}</Badge>
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}
                {onboardingPreference.preferredFlavorTags?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">향미</p>
                    <div className="flex flex-wrap gap-1.5">
                      {onboardingPreference.preferredFlavorTags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">관심 차종과 향미를 설정해주세요.</p>
            )}
          </Card>
        )}

        {/* 취향 수정 모달 */}
        {isOwnProfile && user && (
          <OnboardingPreferenceEditModal
            open={isOnboardingEditModalOpen}
            onOpenChange={setIsOnboardingEditModalOpen}
            userId={user.id}
            preference={onboardingPreference}
            onSuccess={setOnboardingPreference}
          />
        )}

        {/* 정렬 드롭다운 */}
        {notes.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              총 {noteTotal}개
            </span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="rating">별점순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 찜한 차 섹션 - 내 프로필에서만 표시 */}
        {isOwnProfile && (
          <Section title="찜한 차" spacing="lg">
            {wishlistedTeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {wishlistedTeas.map((tea) => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <EmptyState
                type="search"
                message="아직 찜한 차가 없어요."
                action={{ label: '차 탐색하기', onClick: () => navigate('/sasaek') }}
              />
            )}
          </Section>
        )}

        {/* 노트 목록 섹션 */}
        <Section
          title="차록"
          spacing="lg"
          headerAction={
            isOwnProfile ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/saved')}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Bookmark className="w-4 h-4" />
                저장함
              </Button>
            ) : undefined
          }
        >
          {sortedNotes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedNotes.map(note => (
                  <NoteCard key={note.id} note={note} showTeaName />
                ))}
              </div>
              <InfiniteScrollSentinel
                onLoadMore={loadMore}
                loading={isLoadingMore}
                hasMore={hasMore}
              />
            </>
          ) : (
            <EmptyState
              type="notes"
              message="아직 작성한 차록이 없어요."
              action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
            />
          )}
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}
