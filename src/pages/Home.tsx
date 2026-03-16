import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PenLine, Loader2 } from 'lucide-react';
import { formatDateKey, formatDateLabel } from '../utils/dateUtils';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { BottomNav } from '../components/BottomNav';
import { HomeBanner } from '../components/home/HomeBanner';
import { QuickAccess } from '../components/home/QuickAccess';
import { WeeklyCalendar } from '../components/home/WeeklyCalendar';
import { HomeFooter } from '../components/HomeFooter';
import { ModeCarousel } from '../components/home/ModeCarousel';
import { NoteCard } from '../components/NoteCard';
import { ForYouFeed } from '../components/feeds/ForYouFeed';
import { FollowingFeed } from '../components/feeds/FollowingFeed';
import { TagsFeed } from '../components/feeds/TagsFeed';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { useAuth } from '../contexts/AuthContext';
import { notesApi, tagsApi } from '../lib/api';
import { Note, PopularTagItem } from '../types';
import { logger } from '../lib/logger';
import { toast } from 'sonner';

type FeedTab = 'forYou' | 'following' | 'tags';

export function Home() {
  useScrollRestoration();
  const navigate = useNavigate();

  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [feedTab, setFeedTab] = useState<FeedTab>('forYou');
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [followingNotes, setFollowingNotes] = useState<Note[]>([]);
  const [tagNotes, setTagNotes] = useState<Note[]>([]);
  const [followedTags, setFollowedTags] = useState<PopularTagItem[]>([]);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(false);

  // 최근 기록
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateNotes, setDateNotes] = useState<Note[]>([]);
  const [isDateNotesLoading, setIsDateNotesLoading] = useState(false);

  useEffect(() => {
    notesApi.getAll(undefined, true)
      .then((data) => setPublicNotes(Array.isArray(data) ? data as Note[] : []))
      .catch((e) => { logger.error('Failed to fetch feed:', e); toast.error('데이터를 불러오는데 실패했습니다.'); });
  }, []);

  useEffect(() => {
    if (feedTab === 'following' && currentUser && !authLoading) {
      setIsFollowingLoading(true);
      notesApi.getAll(undefined, undefined, undefined, undefined, 'following')
        .then((data) => setFollowingNotes(Array.isArray(data) ? data as Note[] : []))
        .catch(() => setFollowingNotes([]))
        .finally(() => setIsFollowingLoading(false));
    }
  }, [feedTab, currentUser, authLoading]);

  useEffect(() => {
    if (feedTab === 'tags' && currentUser && !authLoading) {
      setIsTagsLoading(true);
      Promise.all([
        notesApi.getAll(undefined, undefined, undefined, undefined, 'tags'),
        tagsApi.getFollowedTags(),
      ])
        .then(([notes, tags]) => {
          setTagNotes(Array.isArray(notes) ? notes as Note[] : []);
          setFollowedTags(Array.isArray(tags) ? tags : []);
        })
        .catch(() => { setTagNotes([]); setFollowedTags([]); })
        .finally(() => setIsTagsLoading(false));
    }
  }, [feedTab, currentUser, authLoading]);

  // 최근 기록 날짜별 fetch
  useEffect(() => {
    if (!currentUser) return;
    setIsDateNotesLoading(true);
    notesApi.getByDate(currentUser.id, formatDateKey(selectedDate))
      .then(setDateNotes)
      .catch(() => setDateNotes([]))
      .finally(() => setIsDateNotesLoading(false));
  }, [currentUser, selectedDate]);

  const goToPrevDate = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const goToNextDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate < tomorrow) setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  };

  const handleRefresh = useCallback(async () => {
    const data = await notesApi.getAll(undefined, true);
    setPublicNotes(Array.isArray(data) ? data as Note[] : []);
  }, []);

  usePullToRefreshForPage(handleRefresh, '/');

  return (
    <div className="min-h-screen pb-20">
      <Header showProfile showLogo />
      <div className="px-4 py-5 pb-20 sm:px-6 space-y-5 md:space-y-6">
        <HeroSection />
        <ModeCarousel />
        <HomeBanner />
        <QuickAccess />
        {currentUser && <WeeklyCalendar />}

        {/* 차록 피드 (통합: 수평 하이라이트 + 탭) */}
        <section aria-label="차록 피드" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">차록 흐름</span>
            <button
              onClick={() => navigate('/sasaek?tab=explore')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              더보기
            </button>
          </div>

          {/* Feed tabs */}
          <Tabs value={feedTab} onValueChange={(v) => setFeedTab(v as FeedTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="forYou" className="flex-1 text-sm font-medium">맞춤</TabsTrigger>
              <TabsTrigger value="following" className="flex-1 text-sm font-medium">구독</TabsTrigger>
              <TabsTrigger value="tags" className="flex-1 text-sm font-medium">향미</TabsTrigger>
            </TabsList>
            <TabsContent value="forYou">
              <ForYouFeed notes={publicNotes} />
            </TabsContent>
            <TabsContent value="following">
              <FollowingFeed
                notes={followingNotes}
                isLoading={isFollowingLoading}
                isLoggedIn={!!currentUser}
                authLoading={authLoading}
              />
            </TabsContent>
            <TabsContent value="tags">
              <TagsFeed
                notes={tagNotes}
                followedTags={followedTags}
                isLoading={isTagsLoading}
                isLoggedIn={!!currentUser}
                authLoading={authLoading}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* 최근 기록 */}
        {currentUser && (
          <section className="rounded-2xl bg-card border border-border/30 p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">최근 기록</span>
              <button
                onClick={() => navigate('/calendar')}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                캘린더로 보기
              </button>
            </div>

            {/* Date navigator */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={goToPrevDate} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors" aria-label="이전 날">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-sm font-medium text-foreground">{formatDateLabel(selectedDate, true)}</span>
              <button
                onClick={goToNextDate}
                disabled={formatDateKey(selectedDate) === formatDateKey(new Date())}
                className="p-1.5 rounded-full hover:bg-muted/50 transition-colors disabled:opacity-30"
                aria-label="다음 날"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Notes for selected date */}
            {isDateNotesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : dateNotes.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {dateNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">이 날의 차록이 없습니다.</p>
                <button
                  onClick={() => navigate('/note/new')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  기록 추가하기
                </button>
              </div>
            )}

            {/* 더보기 → 내 차록 */}
            {dateNotes.length > 0 && (
              <button
                onClick={() => navigate('/my-notes')}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors pt-1"
              >
                더보기
              </button>
            )}
          </section>
        )}

        <HomeFooter recentContributors={[]} />
      </div>
      <BottomNav />
    </div>
  );
}
