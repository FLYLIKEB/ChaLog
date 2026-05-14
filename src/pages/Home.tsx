import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { HomeFooter } from '../components/HomeFooter';
import { PersonalizedHero } from '../components/home/PersonalizedHero';
import { WeeklyStreak } from '../components/home/WeeklyStreak';
import { ModeCarousel } from '../components/home/ModeCarousel';
import { ForYouFeed } from '../components/feeds/ForYouFeed';
import { FollowingFeed } from '../components/feeds/FollowingFeed';
import { TagsFeed } from '../components/feeds/TagsFeed';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
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
  const [hasTodayNote, setHasTodayNote] = useState(false);
  const [streak, setStreak] = useState(0);

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

  return (
    <div className="min-h-screen pb-20">
      <Header showProfile showLogo />
      <div className="px-4 py-5 pb-20 sm:px-6 space-y-5 md:space-y-6">
        <PersonalizedHero hasTodayNote={hasTodayNote} streak={streak} />
        <ModeCarousel />
        {currentUser && (
          <WeeklyStreak
            onTodayNoteStatus={setHasTodayNote}
            onStreakLoaded={setStreak}
          />
        )}

        {/* 차록 피드 (통합: 수평 하이라이트 + 탭) */}
        <section aria-label="차록 피드" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-foreground">차록 흐름</span>
            <button
              onClick={() => navigate('/sasaek?tab=explore')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              탐색에서 전체 보기
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

        <HomeFooter recentContributors={[]} />
      </div>
      <BottomNav />
    </div>
  );
}
