import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { PostCardSkeleton } from '../components/PostCardSkeleton';
import { Post, PostCategory, POST_CATEGORY_LABELS } from '../types';
import { postsApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { Header } from '../components/Header';
import { ChadamBanner } from '../components/ChadamBanner';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { cn } from '../components/ui/utils';
import { toast } from 'sonner';

const CATEGORIES: Array<{ value: PostCategory | null; label: string }> = [
  { value: null, label: '전체' },
  { value: 'brewing_question', label: POST_CATEGORY_LABELS.brewing_question },
  { value: 'recommendation', label: POST_CATEGORY_LABELS.recommendation },
  { value: 'tool', label: POST_CATEGORY_LABELS.tool },
  { value: 'tea_room_review', label: POST_CATEGORY_LABELS.tea_room_review },
  { value: 'announcement', label: POST_CATEGORY_LABELS.announcement },
  { value: 'bug_report', label: POST_CATEGORY_LABELS.bug_report },
];

export function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await postsApi.getAll(selectedCategory ?? undefined);
      setPosts(data);
    } catch {
      toast.error('게시글을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(fetchPosts);
    return () => registerRefresh(undefined);
  }, [registerRefresh, fetchPosts]);

  return (
    <div className="min-h-screen pb-20">
      <Header title="차담" showLogo showProfile />

      {/* 배너 */}
      <div className="px-4 pt-4">
        <ChadamBanner />
      </div>

      {/* 카테고리 탭 - 헤더 높이만큼 아래에서 고정 */}
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-10 bg-background border-b border-border/50">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1 py-2">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setSelectedCategory(value)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedCategory === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            type="feed"
            message={
              selectedCategory
                ? `${POST_CATEGORY_LABELS[selectedCategory]} 카테고리에 아직 게시글이 없어요.`
                : '첫 번째 게시글을 작성해보세요!'
            }
            action={{ label: '✍️ 첫 글 쓰기', onClick: () => navigate('/chadam/new') }}
          />
        ) : (
          <div>
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
