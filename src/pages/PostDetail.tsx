import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Heart,
  Bookmark,
  Pencil,
  Trash2,
  Flag,
  MoreVertical,
  Megaphone,
  Eye,
} from 'lucide-react';
import { Post, Comment, POST_CATEGORY_LABELS } from '../types';
import { postsApi, commentsApi } from '../lib/api';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { CommentList } from '../components/CommentList';
import { PostReportModal } from '../components/PostReportModal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (!postId || isNaN(postId)) {
      navigate('/community', { replace: true });
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [postData, commentsData] = await Promise.all([
          postsApi.getById(postId),
          commentsApi.getByPost(postId),
        ]);
        setPost(postData);
        setIsLiked(postData.isLiked ?? false);
        setLikeCount(postData.likeCount ?? 0);
        setIsBookmarked(postData.isBookmarked ?? false);
        setComments(commentsData);
      } catch {
        toast.error('게시글을 불러오는 데 실패했습니다.');
        navigate('/community', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [postId, navigate]);

  const handleToggleLike = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (isTogglingLike) return;
    try {
      setIsTogglingLike(true);
      const result = await postsApi.toggleLike(postId);
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      toast.error('좋아요 처리에 실패했습니다.');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (isTogglingBookmark) return;
    try {
      setIsTogglingBookmark(true);
      const result = await postsApi.toggleBookmark(postId);
      setIsBookmarked(result.bookmarked);
      toast.success(result.bookmarked ? '북마크에 저장했습니다.' : '북마크를 해제했습니다.');
    } catch {
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await postsApi.delete(postId);
      toast.success('게시글이 삭제되었습니다.');
      navigate('/community', { replace: true });
    } catch {
      toast.error('게시글 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) return null;

  const isAuthor = user?.id === post.userId;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showBack title="게시글" showProfile />

      <div className="px-4 py-4 flex flex-col gap-5">
        {/* 카테고리 + 협찬 뱃지 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {POST_CATEGORY_LABELS[post.category]}
            </span>
            {post.isSponsored && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                <Megaphone className="w-3 h-3" />
                협찬
                {post.sponsorNote && <span className="text-amber-600">· {post.sponsorNote}</span>}
              </span>
            )}
          </div>

          {/* 작성자 메뉴 / 신고 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="더보기"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor ? (
                <>
                  <DropdownMenuItem onClick={() => navigate(`/community/${postId}/edit`)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </>
              ) : (
                user && (
                  <DropdownMenuItem onClick={() => setReportModalOpen(true)}>
                    <Flag className="w-4 h-4 mr-2" />
                    신고
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 제목 */}
        <h1 className="text-lg font-bold text-foreground leading-snug">{post.title}</h1>

        {/* 작성자 정보 + 메타 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{post.user?.name}</span>
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Eye className="w-3 h-3" />
            {post.viewCount}
          </span>
        </div>

        {/* 본문 */}
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap border-t border-b border-border/50 py-4">
          {post.content}
        </div>

        {/* 좋아요 / 북마크 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleLike}
            disabled={isTogglingLike}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors disabled:opacity-50',
              isLiked
                ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'border-border text-muted-foreground hover:bg-muted/50',
            )}
          >
            {isTogglingLike ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Heart className={cn('w-4 h-4', isLiked ? 'fill-rose-500 text-rose-500' : 'fill-none')} />
            )}
            좋아요 {likeCount}
          </button>

          <button
            onClick={handleToggleBookmark}
            disabled={isTogglingBookmark}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors disabled:opacity-50',
              isBookmarked
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-border text-muted-foreground hover:bg-muted/50',
            )}
          >
            {isTogglingBookmark ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark
                className={cn('w-4 h-4', isBookmarked ? 'fill-primary text-primary' : 'fill-none')}
              />
            )}
            북마크
          </button>
        </div>

        {/* 댓글 섹션 */}
        <div className="border-t border-border/50 pt-4">
          <CommentList
            postId={postId}
            comments={comments}
            onCommentsChange={setComments}
          />
        </div>
      </div>

      <PostReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        postId={postId}
      />

      <BottomNav />
    </div>
  );
}
