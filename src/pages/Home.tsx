import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { TeaCard } from '../components/TeaCard';
import { CreatorCard } from '../components/CreatorCard';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { teasApi, notesApi, tagsApi, usersApi } from '../lib/api';
import { Tea, Note, PopularTagItem } from '../types';
import { logger } from '../lib/logger';
import { Loader2, Hash } from 'lucide-react';
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
  const [todayTea, setTodayTea] = useState<Tea | null>(null);
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

  const fetchForYouFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [teasResult, notesResult, trendingTeasResult, trendingCreatorsResult] = await Promise.allSettled([
        teasApi.getAll(),
        notesApi.getAll(undefined, true),
        teasApi.getTrending('7d'),
        usersApi.getTrending('7d'),
      ]);

      if (teasResult.status === 'fulfilled') {
        const teasArray = Array.isArray(teasResult.value) ? teasResult.value : [];
        if (teasArray.length > 0) {
          const randomIndex = Math.floor(Math.random() * teasArray.length);
          setTodayTea(teasArray[randomIndex]);
        }
      } else {
        const error = teasResult.reason;
        logger.error('Failed to fetch teas:', error);
        if (error?.statusCode === 429) {
          toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          toast.error('차 정보를 불러오는데 실패했습니다.');
        }
      }

      if (notesResult.status === 'fulfilled') {
        const notesArray = Array.isArray(notesResult.value) ? notesResult.value : [];
        setPublicNotes(notesArray as Note[]);
      } else {
        const error = notesResult.reason;
        logger.error('Failed to fetch notes:', error);
        if (error?.statusCode === 429) {
          toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          toast.error('노트 정보를 불러오는데 실패했습니다.');
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
      toast.error('팔로잉 피드를 불러오는데 실패했습니다.');
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
      toast.error('태그 피드를 불러오는데 실패했습니다.');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-background dark:from-background dark:to-background pb-20">
        <Header showProfile showLogo />
        <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
          <Section title="☕ 오늘의 차" spacing="lg">
            <TeaCardSkeleton />
          </Section>
          <Section title="📝 피드" spacing="lg">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <NoteCardSkeleton key={i} />
              ))}
            </div>
          </Section>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-background dark:from-background dark:to-background pb-20">
      <Header showProfile showLogo />
      
      <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* 지금 핫한 차 섹션 */}
        <Section title="🔥 지금 핫한 차" spacing="lg">
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

        {/* 인기 크리에이터 섹션 */}
        <Section title="✨ 인기 크리에이터" spacing="lg">
          {trendingCreators.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
              {trendingCreators.map((creator) => (
                <div key={creator.id} className="shrink-0 w-[200px]">
                  <CreatorCard user={creator} followerCount={creator.followerCount} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 인기 크리에이터가 없습니다." />
          )}
        </Section>

        {/* 오늘의 차 섹션 */}
        <Section title="☕ 오늘의 차" spacing="lg">
          {todayTea ? (
            <TeaCard tea={todayTea} />
          ) : (
            <EmptyState
              type="feed"
              message="등록된 차가 없어요. 첫 차를 등록해 보세요!"
              action={{ label: '🍵 새 차 등록', onClick: () => navigate('/tea/new') }}
            />
          )}
        </Section>

        {/* 피드 탭 섹션 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FeedTab)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="forYou" className="flex-1">For You</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
            <TabsTrigger value="tags" className="flex-1">태그</TabsTrigger>
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
                message="아직 등록된 노트가 없어요. 첫 차 노트를 남겨볼까요?"
                action={{ label: '✍️ 첫 노트 쓰기', onClick: () => navigate('/note/new') }}
              />
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            {!currentUser && !authLoading ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  팔로잉한 리뷰어의 노트를 보려면 로그인이 필요합니다.
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
                message="팔로잉한 리뷰어의 노트가 없어요. 리뷰어를 팔로우해 보세요!"
                action={{ label: '🔍 탐색하기', onClick: () => navigate('/search') }}
              />
            )}
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            {!currentUser && !authLoading ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  팔로우한 태그 노트를 보려면 로그인이 필요합니다.
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
                {/* 팔로우 중인 태그 pill */}
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
                      팔로우한 태그가 없습니다.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      태그를 클릭해 상세 페이지에서 팔로우해 보세요!
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    type="feed"
                    message="팔로우한 태그의 공개 노트가 없어요."
                    action={{ label: '🔍 태그 탐색하기', onClick: () => navigate('/search') }}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
