import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, ArrowDownUp } from 'lucide-react';
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

export function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    try {
      const data = await postsApi.getAll(categoryParam, 1, 20, sort);
      setPosts(data);
    } catch {
      toast.error('게시글을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroup, sort]);

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
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-10 bg-background border-b border-border/50">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {posts.map((post, i) => (
              <div
                key={post.id}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <PostCard post={post} />
              </div>
            ))}
          </div>
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
