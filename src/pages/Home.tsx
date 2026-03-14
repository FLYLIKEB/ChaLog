import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { BottomNav } from '../components/BottomNav';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ForYouFeed } from '../components/feeds/ForYouFeed';
import { FollowingFeed } from '../components/feeds/FollowingFeed';
import { TagsFeed } from '../components/feeds/TagsFeed';
import { HomeTrendingSection } from '../components/HomeTrendingSection';
import { HomeFooter } from '../components/HomeFooter';
import { teasApi, notesApi, tagsApi, usersApi } from '../lib/api';
import { Tea, Note, PopularTagItem } from '../types';
import { logger } from '../lib/logger';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { NoteCardSkeleton } from '../components/NoteCardSkeleton';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

type FeedTab = 'forYou' | 'following' | 'tags';

const TAB_LABELS: Record<FeedTab, { label: string; desc: string }> = {
  forYou: { label: '맞춤', desc: '나를 위한 차록' },
  following: { label: '구독', desc: '내가 구독한 다우' },
  tags: { label: '향미', desc: '관심 향미 태그 차록' },
};

export function Home() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [trendingTeas, setTrendingTeas] = useState<Tea[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Array<{ id: number; name: string; profileImageUrl?: string | null; followerCount: number }>>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [followingNotes, setFollowingNotes] = useState<Note[]>([]);
  const [tagNotes, setTagNotes] = useState<Note[]>([]);
  const [followedTags, setFollowedTags] = useState<PopularTagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isTagsLoading, setIsTagsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');

  const fetchForYouFeed = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setIsLoading(true);
      const [notesResult, trendingTeasResult, trendingCreatorsResult] = await Promise.allSettled([
        notesApi.getAll(undefined, true),
        teasApi.getTrending('7d'),
        usersApi.getTrending('7d'),
      ]);
      if (notesResult.status === 'fulfilled') {
        setPublicNotes(Array.isArray(notesResult.value) ? notesResult.value as Note[] : []);
      } else {
        logger.error('Failed to fetch notes:', notesResult.reason);
        if (notesResult.reason?.statusCode === 429) {
          toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          toast.error('차록 정보를 불러오는데 실패했습니다.');
        }
      }
      if (trendingTeasResult.status === 'fulfilled') {
        setTrendingTeas(Array.isArray(trendingTeasResult.value) ? trendingTeasResult.value as Tea[] : []);
      } else {
        logger.error('Failed to fetch trending teas:', trendingTeasResult.reason);
      }
      if (trendingCreatorsResult.status === 'fulfilled') {
        setTrendingCreators(Array.isArray(trendingCreatorsResult.value) ? trendingCreatorsResult.value : []);
      } else {
        logger.error('Failed to fetch trending creators:', trendingCreatorsResult.reason);
      }
    } catch (error) {
      logger.error('Failed to fetch data:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFollowingFeed = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsFollowingLoading(true);
      const notesData = await notesApi.getAll(undefined, undefined, undefined, undefined, 'following');
      setFollowingNotes(Array.isArray(notesData) ? notesData as Note[] : []);
    } catch (error) {
      logger.error('Failed to fetch following notes:', error);
      toast.error('구독 피드를 불러오는데 실패했습니다.');
    } finally {
      setIsFollowingLoading(false);
    }
  }, [currentUser]);

  const fetchTagsFeed = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsTagsLoading(true);
      const [notesData, tagsData] = await Promise.all([
        notesApi.getAll(undefined, undefined, undefined, undefined, 'tags'),
        tagsApi.getFollowedTags(),
      ]);
      setTagNotes(Array.isArray(notesData) ? notesData as Note[] : []);
      setFollowedTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (error) {
      logger.error('Failed to fetch tag feed:', error);
      toast.error('향미 차록 흐름을 불러오는데 실패했습니다.');
    } finally {
      setIsTagsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchForYouFeed(); }, [fetchForYouFeed]);

  useEffect(() => {
    if (activeTab === 'following' && currentUser && !authLoading) fetchFollowingFeed();
  }, [activeTab, currentUser, authLoading, fetchFollowingFeed]);

  useEffect(() => {
    if (activeTab === 'tags' && currentUser && !authLoading) fetchTagsFeed();
  }, [activeTab, currentUser, authLoading, fetchTagsFeed]);

  const handleRefresh = useCallback(async () => {
    await fetchForYouFeed({ silent: true });
    if (activeTab === 'following' && currentUser) await fetchFollowingFeed();
    if (activeTab === 'tags' && currentUser) await fetchTagsFeed();
  }, [fetchForYouFeed, fetchFollowingFeed, fetchTagsFeed, activeTab, currentUser]);

  usePullToRefreshForPage(handleRefresh, '/');

  const recentContributors = useMemo(() => {
    const seen = new Set<number>();
    return publicNotes
      .filter((n) => { if (seen.has(n.userId)) return false; seen.add(n.userId); return true; })
      .map((n) => ({ id: n.userId, name: n.userName }));
  }, [publicNotes]);

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <Header showProfile showLogo />
        <div className="px-4 py-6 pb-20 sm:px-6 sm:py-8 space-y-4 sm:space-y-6">
          <HeroSection />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <NoteCardSkeleton key={i} />)}
          </div>
          <footer className="mt-12 pt-8 pb-6 border-t border-border/40">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>차멍 v0.1</span><span className="text-border">·</span>
              <span>이용약관</span><span className="text-border">·</span>
              <span>개인정보처리방침</span>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/60 mt-3">© 2026 차멍. All rights reserved.</p>
          </footer>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header showProfile showLogo />
      <div className="px-4 py-6 pb-20 sm:px-6 sm:py-8 space-y-4 sm:space-y-6">
        <HeroSection />
        <HomeTrendingSection trendingTeas={trendingTeas} trendingCreators={trendingCreators} />
        <section aria-label="차록 흐름">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">차록 흐름</h2>
            <p className="text-xs text-muted-foreground">{TAB_LABELS[activeTab].desc}</p>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
            <TabsList className="w-full mb-4">
              {(Object.keys(TAB_LABELS) as FeedTab[]).map((tab) => (
                <TabsTrigger key={tab} value={tab} className="flex-1 text-sm font-medium">
                  {TAB_LABELS[tab].label}
                </TabsTrigger>
              ))}
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
        <HomeFooter recentContributors={recentContributors} />
      </div>
      <BottomNav />
    </div>
  );
}
