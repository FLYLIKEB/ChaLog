import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { usersApi, notesApi, followsApi } from '../lib/api';
import { User, Note, UserOnboardingPreference, UserLevel } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { ProfileImageEditModal } from '../components/ProfileImageEditModal';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { OnboardingPreferenceEditModal } from '../components/OnboardingPreferenceEditModal';
import { useAuth } from '../contexts/AuthContext';
import { ProfileZone } from '../components/profile/ProfileZone';
import { UserNoteList } from '../components/profile/UserNoteList';

type SortType = 'latest' | 'rating';

export function UserProfile() {
  useScrollRestoration();

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
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);

  const isOwnProfile = !authLoading && !!currentUser && userId === currentUser.id;
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (isNaN(userId)) return;
    usersApi.getLevel(userId).then(setUserLevel).catch(() => {});
  }, [userId]);

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
      prev ? { ...prev, isFollowing: !prevIsFollowing, followerCount: (prev.followerCount ?? 0) + delta } : prev,
    );

    try {
      const result = await followsApi.toggle(userId) as { isFollowing: boolean };
      setUser((prev) => prev ? { ...prev, isFollowing: result.isFollowing } : prev);
    } catch (error) {
      logger.error('Follow toggle failed:', error);
      setUser((prev) =>
        prev
          ? { ...prev, isFollowing: prevIsFollowing, followerCount: (prev.followerCount ?? 0) - delta }
          : prev,
      );
      toast.error('구독 처리 중 오류가 발생했습니다.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (notes.length === 0) return { averageRating: 0, totalLikes: 0, noteCount: 0 };
    const ratedNotes = notes.filter((n) => n.overallRating != null && Number(n.overallRating) > 0);
    const averageRating = ratedNotes.length > 0
      ? ratedNotes.reduce((sum, note) => sum + Number(note.overallRating), 0) / ratedNotes.length
      : 0;
    const totalLikes = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0);
    const safeAverageRating = isNaN(averageRating) ? 0 : Number(averageRating.toFixed(1));
    return { averageRating: safeAverageRating, totalLikes, noteCount: noteTotal || notes.length };
  }, [notes, noteTotal]);

  const handleProfileImageUpdate = (imageUrl: string) => {
    if (user) setUser({ ...user, profileImageUrl: imageUrl || null });
  };

  const handleProfileInfoUpdate = (updatedFields: Partial<User>) => {
    if (user) setUser({ ...user, ...updatedFields });
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
        {/* Profile Zone skeleton */}
        <div className="h-16 bg-gradient-to-br from-primary/8 via-amber-50/30 to-transparent dark:from-primary/10 dark:via-stone-900/20 dark:to-transparent" />
        <div className="px-4 -mt-8 pb-4 space-y-4">
          <div className="flex items-end gap-3">
            <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse shrink-0 ring-2 ring-background" />
            <div className="flex-1 space-y-1.5 pb-1">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="h-3 w-44 rounded bg-muted animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-around py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="h-7 w-10 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted animate-pulse" />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-14 rounded-full bg-muted animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 px-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
          ))}
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

      <ProfileZone
        user={user}
        isOwnProfile={isOwnProfile}
        isFollowLoading={isFollowLoading}
        noteCount={noteTotal}
        stats={stats}
        userLevel={userLevel}
        onboardingPreference={isOwnProfile ? onboardingPreference : null}
        onFollowToggle={handleFollowToggle}
        onEditImage={() => setIsEditModalOpen(true)}
        onEditProfile={() => setIsProfileEditModalOpen(true)}
        onEditPreference={() => setIsOnboardingEditModalOpen(true)}
      />

      <ProfileImageEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        currentImageUrl={user.profileImageUrl}
        onSuccess={handleProfileImageUpdate}
        userId={user.id}
      />
      {isOwnProfile && (
        <>
          <ProfileEditModal
            open={isProfileEditModalOpen}
            onOpenChange={setIsProfileEditModalOpen}
            user={user}
            onSuccess={handleProfileInfoUpdate}
          />
          <OnboardingPreferenceEditModal
            open={isOnboardingEditModalOpen}
            onOpenChange={setIsOnboardingEditModalOpen}
            userId={user.id}
            preference={onboardingPreference}
            onSuccess={setOnboardingPreference}
          />
        </>
      )}

      <UserNoteList
        notes={notes}
        noteTotal={noteTotal}
        sort={sort}
        onSortChange={setSort}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        isOwnProfile={isOwnProfile}
      />

      <BottomNav />
    </div>
  );
}
