import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { TeaCard } from '../components/TeaCard';
import { CreatorCard } from '../components/CreatorCard';
import { UserAvatar } from '../components/ui/UserAvatar';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { teasApi, notesApi, tagsApi, usersApi } from '../lib/api';
import { Tea, Note, PopularTagItem } from '../types';
import { logger } from '../lib/logger';
import { Loader2, Hash, MessageCircle, ChevronRight } from 'lucide-react';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { NoteCardSkeleton } from '../components/NoteCardSkeleton';
import { TeaCardSkeleton } from '../components/TeaCardSkeleton';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

type FeedTab = 'forYou' | 'following' | 'tags';

export function Home() {
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [trendingTeas, setTrendingTeas] = useState<Tea[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Array<{ id: number; name: string; profileImageUrl?: string | null } & { followerCount: number }>>([]);
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
        const notesArray = Array.isArray(notesResult.value) ? notesResult.value : [];
        setPublicNotes(notesArray as Note[]);
      } else {
        const error = notesResult.reason;
        logger.error('Failed to fetch notes:', error);
        if (error?.statusCode === 429) {
          toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          toast.error('차록 정보를 불러오는데 실패했습니다.');
        }
      }

      if (trendingTeasResult.status === 'fulfilled') {
        const arr = Array.isArray(trendingTeasResult.value) ? trendingTeasResult.value : [];
        setTrendingTeas(arr as Tea[]);
      } else {
        logger.error('Failed to fetch trending teas:', trendingTeasResult.reason);
      }

      if (trendingCreatorsResult.status === 'fulfilled') {
        const arr = Array.isArray(trendingCreatorsResult.value) ? trendingCreatorsResult.value : [];
        setTrendingCreators(arr);
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
      const notesArray = Array.isArray(notesData) ? notesData : [];
      setFollowingNotes(notesArray as Note[]);
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
      const notesArray = Array.isArray(notesData) ? notesData : [];
      setTagNotes(notesArray as Note[]);
      setFollowedTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (error) {
      logger.error('Failed to fetch tag feed:', error);
      toast.error('향미 차록 흐름을 불러오는데 실패했습니다.');
    } finally {
      setIsTagsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchForYouFeed();
  }, [fetchForYouFeed]);

  useEffect(() => {
    if (activeTab === 'following' && currentUser && !authLoading) {
      fetchFollowingFeed();
    }
  }, [activeTab, currentUser, authLoading, fetchFollowingFeed]);

  useEffect(() => {
    if (activeTab === 'tags' && currentUser && !authLoading) {
      fetchTagsFeed();
    }
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
      .filter((n) => {
        if (seen.has(n.userId)) return false;
        seen.add(n.userId);
        return true;
      })
      .map((n) => ({ id: n.userId, name: n.userName }));
  }, [publicNotes]);

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <Header showProfile showLogo />
        <div className="px-4 py-6 pb-20 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
          <HeroSection />
          <Section title="📄 차록 흐름" description="다양한 차록을 둘러보세요." spacing="lg">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <NoteCardSkeleton key={i} />
              ))}
            </div>
          </Section>
          <footer className="mt-12 pt-8 pb-6 border-t border-border/40">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>차멍 v0.1</span>
              <span className="text-border">·</span>
              <span>이용약관</span>
              <span className="text-border">·</span>
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
      <div className="px-4 py-6 pb-20 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero - 차멍 설명 */}
        <HeroSection />

        {/* 요즘 인기 차 섹션 */}
        <Section title="🍵 요즘 인기 차" description="최근 7일간 차록이 많은 인기 차예요." spacing="lg">
          {trendingTeas.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
              {trendingTeas.map((tea) => (
                <div key={tea.id} className="shrink-0 w-[280px]">
                  <TeaCard tea={tea} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 트렌딩 차가 없습니다." />
          )}
        </Section>

        {/* 인기 다우 섹션 */}
        <Section title="🌿 인기 다우" description="구독자가 많은 인기 다우를 만나보세요." spacing="lg">
          {trendingCreators.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
              {trendingCreators.map((creator) => (
                <div key={creator.id} className="shrink-0 w-[200px]">
                  <CreatorCard user={creator} followerCount={creator.followerCount} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 인기 다우가 없습니다." />
          )}
        </Section>

        {/* 차록 흐름 탭 섹션 */}
        <Section title="📄 차록 흐름" description="다양한 차록을 둘러보세요." spacing="lg">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FeedTab)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="forYou" className="flex-1">맞춤차</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">구독</TabsTrigger>
            <TabsTrigger value="tags" className="flex-1">향미</TabsTrigger>
          </TabsList>

          <TabsContent value="forYou" className="mt-4">
            {publicNotes.length > 0 ? (
              <div className="space-y-3">
                {publicNotes.map((note, i) => (
                  <div
                    key={note.id}
                    className="animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <NoteCard note={note} showTeaName />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                type="feed"
                message="아직 등록된 차록이 없어요. 첫 차록을 남겨볼까요?"
                action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
              />
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            {!currentUser && !authLoading ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  구독한 다우의 차록을 보려면 로그인이 필요합니다.
                </p>
                <Button size="sm" onClick={() => navigate('/login')}>
                  로그인하기
                </Button>
              </div>
            ) : isFollowingLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : followingNotes.length > 0 ? (
              <div className="space-y-3">
                {followingNotes.map(note => (
                  <NoteCard key={note.id} note={note} showTeaName />
                ))}
              </div>
            ) : (
              <EmptyState
                type="feed"
                message="구독한 다우의 차록이 없어요. 다우를 구독해 보세요!"
                action={{ label: '사색하기', onClick: () => navigate('/sasaek') }}
              />
            )}
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            {!currentUser && !authLoading ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  구독한 향미 차록을 보려면 로그인이 필요합니다.
                </p>
                <Button size="sm" onClick={() => navigate('/login')}>
                  로그인하기
                </Button>
              </div>
            ) : isTagsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <>
                {/* 구독 중인 향미 pill */}
                {followedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-border/50">
                    {followedTags.map((tag) => (
                      <Link
                        key={tag.name}
                        to={`/tag/${encodeURIComponent(tag.name)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Hash className="w-3 h-3" />
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                )}
                {tagNotes.length > 0 ? (
                  <div className="space-y-3">
                    {tagNotes.map(note => (
                      <NoteCard key={note.id} note={note} showTeaName />
                    ))}
                  </div>
                ) : followedTags.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <Hash className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      구독한 향미가 없습니다.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      향미를 클릭해 상세 페이지에서 구독해 보세요!
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    type="feed"
                    message="구독한 테마의 공개 차록이 없어요."
                    action={{ label: '테마 사색하기', onClick: () => navigate('/sasaek') }}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
        </Section>

        {/* 최근 기여자 - 아주 작게 가로 스크롤 */}
        {recentContributors.length > 0 && (
          <div className="mt-8 pt-4 border-t border-black/5">
            <p className="text-[10px] text-muted-foreground mb-2 px-1">최근 기여자</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 scrollbar-hide">
              {recentContributors.map((c) => (
                <Link
                  key={c.id}
                  to={`/user/${c.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                >
                  <UserAvatar name={c.name} size="xs" className="shrink-0" />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 하단 푸터 - 오픈톡 + 개발정보 */}
        <footer className="mt-12 pt-8 pb-6 border-t border-black/5">
          {import.meta.env.VITE_KAKAO_OPEN_CHAT_URL && (
            <a
              href={import.meta.env.VITE_KAKAO_OPEN_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 w-full max-w-sm mx-auto py-4 px-5 rounded-2xl bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#191919] transition-all duration-200 mb-5 card-shadow hover:shadow-[0_4px_16px_rgba(254,229,0,0.35)] hover:-translate-y-0.5 active:translate-y-0 border border-[#FEE500]/80"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#191919]/8 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#191919]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#191919]">
                    차에 대해 이야기해요
                  </p>
                  <p className="text-xs text-[#191919]/70 mt-0.5">
                    오픈채팅에서 만나요
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#191919]/60 group-hover:text-[#191919] group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
            <span>차멍 v0.1</span>
            <span className="text-border/60">·</span>
            <button type="button" onClick={() => toast.info('준비 중입니다.')} className="text-[11px] font-normal hover:text-foreground/70 transition-colors">
              이용약관
            </button>
            <span className="text-border/60">·</span>
            <button type="button" onClick={() => toast.info('준비 중입니다.')} className="text-[11px] font-normal hover:text-foreground/70 transition-colors">
              개인정보처리방침
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-3">© 2026 차멍. All rights reserved.</p>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
