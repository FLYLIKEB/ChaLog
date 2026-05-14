import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowDownUp, ChevronRight, Flame, LayoutList, PencilLine } from 'lucide-react';
import { PostCardSkeleton } from '../components/PostCardSkeleton';
import { Post, PostCategory, POST_CATEGORY_LABELS } from '../types';
import { postsApi, type PostSort } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { Header } from '../components/Header';

import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../components/ui/use-mobile';
import { cn } from '../components/ui/utils';
import { toast } from 'sonner';
import { InfiniteScrollSentinel } from '../components/InfiniteScrollSentinel';
import { FilterTabBar } from '../components/FilterTabBar';
import { PageListContent } from '../components/ui/PageListContent';

const SORT_OPTIONS: Array<{ value: PostSort; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '인기순' },
  { value: 'commented', label: '댓글순' },
];

type GroupKey = 'all' | 'popular' | 'mine' | 'qna' | 'review' | 'announcement' | 'report';

const CATEGORY_GROUPS: Array<{ key: GroupKey; label: string; categories: PostCategory[] }> = [
  {
    key: 'qna',
    label: '질문·토론',
    categories: ['brewing_question', 'recommendation', 'discussion'],
  },
  { key: 'review', label: '리뷰', categories: ['tea_review', 'tool_review', 'tea_room_review'] },
  { key: 'announcement', label: '공지', categories: ['announcement'] },
  { key: 'report', label: '제보', categories: ['bug_report'] },
];

const GROUPS: Array<{ key: GroupKey; label: string; categories: PostCategory[] }> = [
  { key: 'all', label: '전체', categories: [] },
  { key: 'popular', label: '인기글', categories: [] },
  ...CATEGORY_GROUPS,
];

// 데스크톱에서 표시할 게시판 그룹
const DESKTOP_BOARDS = CATEGORY_GROUPS;

const PAGE_SIZE = 20;

export function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupKey>(isMobile ? 'qna' : 'all');
  const [sort, setSort] = useState<PostSort>('latest');

  const getGroupParams = useCallback((groupKey: GroupKey): { categoryParam: PostCategory | PostCategory[] | undefined; effectiveSort: PostSort; mine: boolean } => {
    if (groupKey === 'popular') {
      return { categoryParam: undefined, effectiveSort: 'popular', mine: false };
    }
    if (groupKey === 'mine') {
      return { categoryParam: undefined, effectiveSort: sort, mine: true };
    }
    const group = GROUPS.find((g) => g.key === groupKey);
    const categoryParam =
      !group || group.categories.length === 0
        ? undefined
        : group.categories.length === 1
          ? group.categories[0]
          : group.categories;
    return { categoryParam, effectiveSort: sort, mine: false };
  }, [sort]);

  const fetchPosts = useCallback(async () => {
    const { categoryParam, effectiveSort, mine } = getGroupParams(selectedGroup);
    setIsLoading(true);
    setPage(1);
    try {
      // 모바일: 선택된 그룹만 fetch / 데스크톱: 전체 fetch
      const [filtered, all] = await Promise.all([
        postsApi.getAll(categoryParam, 1, PAGE_SIZE, effectiveSort, undefined, mine),
        isMobileRef.current ? Promise.resolve([]) : postsApi.getAll(undefined, 1, 50, sort),
      ]);
      setPosts(filtered);
      setHasMore(filtered.length === PAGE_SIZE);
      if (!isMobileRef.current) setAllPosts(all);
    } catch {
      toast.error('게시글을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroup, sort, getGroupParams]);

  const handleLoadMore = useCallback(async () => {
    const { categoryParam, effectiveSort, mine } = getGroupParams(selectedGroup);
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const morePosts = await postsApi.getAll(categoryParam, nextPage, PAGE_SIZE, effectiveSort, undefined, mine);
      setPosts((prev) => [...prev, ...morePosts]);
      setPage(nextPage);
      setHasMore(morePosts.length === PAGE_SIZE);
    } catch {
      toast.error('게시글을 더 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedGroup, sort, page, getGroupParams]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen pb-20">
      <Header title="차담" showLogo showProfile />

      {/* 전체/인기글 + 카테고리 탭 */}
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] md:top-0 z-10 bg-background">
        {/* 전체보기 / 인기글 — 항상 노출 */}
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedGroup === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent border border-border/60 text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutList className="w-3.5 h-3.5" />
            전체
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroup('popular')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedGroup === 'popular'
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent border border-border/60 text-muted-foreground hover:text-foreground',
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            인기글
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setSelectedGroup('mine')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedGroup === 'mine'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent border border-border/60 text-muted-foreground hover:text-foreground',
              )}
            >
              <PencilLine className="w-3.5 h-3.5" />
              내가 쓴 글
            </button>
          )}
          {/* 정렬 */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => {
                const idx = SORT_OPTIONS.findIndex((o) => o.value === sort);
                setSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span className="font-medium">{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
            </button>
          </div>
        </div>
        {/* 카테고리 탭 */}
        <FilterTabBar
          activeKey={selectedGroup}
          onChange={setSelectedGroup}
          tabs={CATEGORY_GROUPS.map(({ key, label }) => ({ key, label }))}
        />
      </div>

      {/* 게시글 목록 */}
      <PageListContent>
        {isLoading ? (
          <>
            {/* 모바일: 단일 리스트 스켈레톤 */}
            <div className="md:hidden space-y-3 pt-2">
              {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
            </div>
            {/* 데스크톱: 게시판별 스켈레톤 */}
            <div className="hidden md:grid md:grid-cols-2 gap-8 pt-4">
              {DESKTOP_BOARDS.map((board) => (
                <div key={board.key} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="h-6 w-24 rounded bg-muted animate-pulse" />
                  {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* 모바일: 단일 필터 리스트 */}
            <div className="md:hidden">
              {posts.length === 0 ? (
                <EmptyState
                  type="feed"
                  message={
                    selectedGroup !== 'all'
                      ? `${GROUPS.find((g) => g.key === selectedGroup)?.label}에 아직 게시글이 없어요.`
                      : '첫 번째 게시글을 작성해보세요!'
                  }
                  action={{ label: '✍️ 첫 글 쓰기', onClick: () => navigate('/chadam/new') }}
                />
              ) : (
                <div className="divide-y divide-accent">
                  {posts.map((post, i) => (
                    <div key={post.id} className="animate-fade-in-up opacity-0" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}>
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              )}
              <InfiniteScrollSentinel
                onLoadMore={handleLoadMore}
                loading={isLoadingMore}
                hasMore={hasMore && posts.length > 0}
              />
            </div>

            {/* 데스크톱: selectedGroup === 'all' → 게시판별 분리 / 특정 그룹 → 단일 게시판 뷰 */}
            <div className="hidden md:block pt-4">
              {selectedGroup === 'all' ? (
                <div className="grid grid-cols-2 gap-8">
                  {DESKTOP_BOARDS.map((board) => {
                    const boardPosts = allPosts.filter((p) =>
                      board.categories.includes(p.category as PostCategory)
                    ).slice(0, 5);
                    return (
                      <section key={board.key} className="rounded-xl border border-border/60 bg-card p-4 divide-y divide-accent">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <h2 className="font-semibold text-foreground">{board.label}</h2>
                          <button
                            type="button"
                            onClick={() => setSelectedGroup(board.key)}
                            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            더보기 <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {boardPosts.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">아직 게시글이 없어요.</p>
                        ) : (
                          <div className="divide-y divide-accent">
                            {boardPosts.map((post, i) => (
                              <div key={post.id} className="animate-fade-in-up opacity-0" style={{ animationDelay: `${i * 50}ms` }}>
                                <PostCard post={post} />
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-accent">
                    {posts.map((post, i) => (
                      <div key={post.id} className="animate-fade-in-up opacity-0" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}>
                        <PostCard post={post} />
                      </div>
                    ))}
                    {posts.length === 0 && (
                      <EmptyState
                        type="feed"
                        message={`${GROUPS.find((g) => g.key === selectedGroup)?.label}에 아직 게시글이 없어요.`}
                        action={{ label: '✍️ 첫 글 쓰기', onClick: () => navigate('/chadam/new') }}
                      />
                    )}
                  </div>
                  <InfiniteScrollSentinel
                    onLoadMore={handleLoadMore}
                    loading={isLoadingMore}
                    hasMore={hasMore && posts.length > 0}
                  />
                </>
              )}
            </div>
          </>
        )}
      </PageListContent>

      {/* 새 글 작성 FAB */}
      {user && (
        <FloatingActionButton
          onClick={() => navigate('/chadam/new')}
          ariaLabel="새 게시글 작성"
          position="aboveNav"
        >
          <Plus className="w-6 h-6" />
        </FloatingActionButton>
      )}

      <BottomNav />
    </div>
  );
}
