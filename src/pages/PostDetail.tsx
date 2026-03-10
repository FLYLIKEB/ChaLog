import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Pin,
  Shield,
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

  const fetchData = useCallback(async () => {
    if (!postId || isNaN(postId)) return;
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
      navigate('/chadam', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [postId, navigate]);

  useEffect(() => {
    if (!postId || isNaN(postId)) {
      navigate('/chadam', { replace: true });
      return;
    }
    fetchData();
  }, [postId, navigate, fetchData]);

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
      navigate('/chadam', { replace: true });
    } catch {
      toast.error('게시글 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) return null;

  const isAuthor = user?.id === post.userId;

  return (
    <div className="min-h-screen pb-20">
      <Header showBack title="게시글" showProfile />

      <div
        className={cn(
          'px-5 py-5 flex flex-col gap-5',
          post.isPinned && 'relative border-l-2 border-l-primary/60 pl-6 pr-5 py-4 my-2 bg-primary/4 rounded-lg',
        )}
      >
        {/* 카테고리 + 공지 + 협찬 뱃지 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {post.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                <Pin className="w-3 h-3 fill-muted-foreground" />
                공지
              </span>
            )}
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
                  <DropdownMenuItem onClick={() => navigate(`/chadam/${postId}/edit`)}>
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {post.isAnonymous ? (
            <span className="font-medium text-foreground">익명</span>
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => post.user?.id && navigate(`/user/${post.user.id}`)}
                className={cn(
                  'hover:underline',
                  post.user?.role === 'admin'
                    ? 'font-semibold text-green-600 hover:text-green-700'
                    : 'font-medium text-foreground',
                )}
                aria-label="작성자 프로필 보기"
              >
                {post.user?.name}
              </button>
              {post.user?.role === 'admin' && (
                <Shield className="w-3.5 h-3.5 text-green-600 shrink-0" aria-label="관리자" />
              )}
            </span>
          )}
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Eye className="w-3 h-3" />
            {post.viewCount}
          </span>
        </div>

        {/* 본문 */}
        <div className="post-content-markdown text-sm text-foreground leading-relaxed border-t border-b border-border/50 py-4 [&_p]:whitespace-pre-wrap [&_p]:my-1 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {/* 이미지 */}
        {post.images && post.images.length > 0 && (
          <div className="space-y-4">
            {post.images.map((img, idx) => (
              <figure key={`img-${idx}-${img.url}`} className="space-y-2">
                <img
                  src={img.url}
                  alt={img.caption || `게시글 이미지 ${idx + 1}`}
                  className="w-full rounded-xl object-cover max-h-80"
                  loading="lazy"
                />
                {img.caption && (
                  <figcaption className="text-xs text-muted-foreground text-center">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

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
