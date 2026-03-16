import { useCallback, useEffect, useState } from 'react';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { BottomNav } from '../components/BottomNav';
import { HomeBanner } from '../components/home/HomeBanner';
import { QuickAccess } from '../components/home/QuickAccess';
import { WeeklyCalendar } from '../components/home/WeeklyCalendar';
import { RecommendedContent } from '../components/home/RecommendedContent';
import { HomeFooter } from '../components/HomeFooter';
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

  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [feedTab, setFeedTab] = useState<FeedTab>('forYou');
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [followingNotes, setFollowingNotes] = useState<Note[]>([]);
  const [tagNotes, setTagNotes] = useState<Note[]>([]);
  const [followedTags, setFollowedTags] = useState<PopularTagItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(false);

  useEffect(() => {
    setIsFeedLoading(true);
    notesApi.getAll(undefined, true)
      .then((data) => setPublicNotes(Array.isArray(data) ? data as Note[] : []))
      .catch((e) => { logger.error('Failed to fetch feed:', e); toast.error('데이터를 불러오는데 실패했습니다.'); })
      .finally(() => setIsFeedLoading(false));
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
        <HomeBanner />
        <QuickAccess />
        {currentUser && <WeeklyCalendar />}
        <RecommendedContent />

        {/* 차록 피드 */}
        <section aria-label="차록 피드">
          <Tabs value={feedTab} onValueChange={(v) => setFeedTab(v as FeedTab)}>
            <TabsList className="w-full mb-4">
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
