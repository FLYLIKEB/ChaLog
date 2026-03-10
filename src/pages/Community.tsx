import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, ArrowDownUp, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { PostCardSkeleton } from '../components/PostCardSkeleton';
import { Post, PostCategory, POST_CATEGORY_LABELS } from '../types';
import { postsApi, type PostSort } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { Header } from '../components/Header';
import { ChadamBanner } from '../components/ChadamBanner';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { useAuth } from '../contexts/AuthContext';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { useIsMobile } from '../components/ui/use-mobile';
import { cn } from '../components/ui/utils';
import { toast } from 'sonner';

const SORT_OPTIONS: Array<{ value: PostSort; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기글' },
  { value: 'commented', label: '댓글많은순' },
];

type GroupKey = 'all' | 'qna' | 'review' | 'announcement' | 'report';

const GROUPS: Array<{ key: GroupKey; label: string; categories: PostCategory[] }> = [
  { key: 'all', label: '전체', categories: [] },
  {
    key: 'qna',
    label: '질문·토론',
    categories: ['brewing_question', 'recommendation', 'tool'],
  },
  { key: 'review', label: '리뷰', categories: ['tea_room_review'] },
  { key: 'announcement', label: '공지', categories: ['announcement'] },
  { key: 'report', label: '제보', categories: ['bug_report'] },
];

// 데스크톱에서 표시할 게시판 그룹 (전체 제외)
const DESKTOP_BOARDS = GROUPS.filter((g) => g.key !== 'all');

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
  const [selectedGroup, setSelectedGroup] = useState<GroupKey>('all');
  const [sort, setSort] = useState<PostSort>('latest');

  const fetchPosts = useCallback(async () => {
    const group = GROUPS.find((g) => g.key === selectedGroup);
    const categoryParam =
      !group || group.categories.length === 0
        ? undefined
        : group.categories.length === 1
          ? group.categories[0]
          : group.categories;
    setIsLoading(true);
    setPage(1);
    try {
      // 모바일: 선택된 그룹만 fetch / 데스크톱: 전체 fetch
      const [filtered, all] = await Promise.all([
        postsApi.getAll(categoryParam, 1, PAGE_SIZE, sort),
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
  }, [selectedGroup, sort]);

  const handleLoadMore = useCallback(async () => {
    const group = GROUPS.find((g) => g.key === selectedGroup);
    const categoryParam =
      !group || group.categories.length === 0
        ? undefined
        : group.categories.length === 1
          ? group.categories[0]
          : group.categories;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const morePosts = await postsApi.getAll(categoryParam, nextPage, PAGE_SIZE, sort);
      setPosts((prev) => [...prev, ...morePosts]);
      setPage(nextPage);
      setHasMore(morePosts.length === PAGE_SIZE);
    } catch {
      toast.error('게시글을 더 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedGroup, sort, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  usePullToRefreshForPage(fetchPosts, '/chadam');

  return (
    <div className="min-h-screen pb-20">
      <Header title="차담" showLogo showProfile />

      {/* 배너 */}
      <div className="px-4 pt-4">
        <ChadamBanner />
      </div>

      {/* 카테고리 탭 + 정렬 - 헤더 높이만큼 아래에서 고정 */}
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] md:top-0 z-10 bg-background border-b border-border/50">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1 py-1.5 items-center">
          {GROUPS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedGroup(key)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedGroup === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {label}
            </button>
          ))}
          <div className="shrink-0 ml-auto flex items-center gap-1 pl-2 border-l border-border/50">
            <ArrowDownUp className="w-4 h-4 text-muted-foreground" aria-hidden />
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={cn(
                  'shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors',
                  sort === value
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="px-4">
        {isLoading ? (
          <>
            {/* 모바일: 단일 리스트 스켈레톤 */}
            <div className="md:hidden space-y-3 pt-2">
              {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
            </div>
            {/* 데스크톱: 게시판별 스켈레톤 */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 pt-4">
              {DESKTOP_BOARDS.map((board) => (
                <div key={board.key} className="space-y-3">
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
                <div className="space-y-0 divide-y divide-border/30 pt-2">
                  {posts.map((post, i) => (
                    <div key={post.id} className="animate-fade-in-up opacity-0" style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}>
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              )}
              {/* 더 보기 버튼 */}
              {!isLoading && hasMore && posts.length > 0 && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full max-w-xs"
                  >
                    {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    더 보기
                  </Button>
                </div>
              )}
            </div>

            {/* 데스크톱: selectedGroup === 'all' → 게시판별 분리 / 특정 그룹 → 단일 게시판 뷰 */}
            <div className="hidden md:block pt-4">
              {selectedGroup === 'all' ? (
                <div className="grid grid-cols-2 gap-6">
                  {DESKTOP_BOARDS.map((board) => {
                    const boardPosts = allPosts.filter((p) =>
                      board.categories.includes(p.category as PostCategory)
                    ).slice(0, 5);
                    return (
                      <section key={board.key} className="space-y-2">
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
                          <div className="divide-y divide-border/30">
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
                  <div className="space-y-0 divide-y divide-border/30">
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
                  {/* 데스크톱 특정 그룹에서도 더 보기 */}
                  {hasMore && posts.length > 0 && (
                    <div className="flex justify-center pt-4 pb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full max-w-xs"
                      >
                        {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        더 보기
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

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
