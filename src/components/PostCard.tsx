import React, { type FC, useState, memo } from 'react';
import { Heart, Bookmark, Loader2, MessageCircle, Eye, Megaphone, Image as ImageIcon } from 'lucide-react';
import { Post, POST_CATEGORY_LABELS } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { postsApi } from '../lib/api';
import { cn } from './ui/utils';

interface PostCardProps {
  post: Post;
  commentCount?: number;
  onBookmarkToggle?: (isBookmarked: boolean) => void;
}

const PostCardComponent: FC<PostCardProps> = ({ post, commentCount, onBookmarkToggle }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  const handleClick = () => {
    navigate(`/chadam/${post.id}`);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (isTogglingLike) return;
    try {
      setIsTogglingLike(true);
      const result = await postsApi.toggleLike(post.id);
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      toast.error('좋아요 처리에 실패했습니다.');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (isTogglingBookmark) return;
    try {
      setIsTogglingBookmark(true);
      const result = await postsApi.toggleBookmark(post.id);
      setIsBookmarked(result.bookmarked);
      onBookmarkToggle?.(result.bookmarked);
    } catch {
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'w-full text-left py-4 px-0 cursor-pointer',
        'border-b border-border/50 last:border-b-0',
        'hover:bg-muted/20 transition-colors',
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex flex-col gap-2">
        {/* 카테고리 + 공지 + 협찬 뱃지 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {POST_CATEGORY_LABELS[post.category]}
          </span>
          {post.isPinned && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              공지
            </span>
          )}
          {post.isSponsored && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
              <Megaphone className="w-3 h-3" />
              협찬
            </span>
          )}
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {post.title}
        </h3>

        {/* 첫 이미지 썸네일 */}
        {post.images && post.images.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5">
            <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted">
              <img
                src={post.images[0].thumbnailUrl || post.images[0].url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {post.images.length > 1 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                <ImageIcon className="w-3.5 h-3.5" />
                +{post.images.length - 1}
              </span>
            )}
          </div>
        )}

        {/* 내용 미리보기 */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {post.content}
        </p>

        {/* 하단: 작성자 + 통계 */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            {post.isAnonymous ? (
              <span className="font-medium truncate">익명</span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (post.user?.id) navigate(`/user/${post.user.id}`);
                  }}
                  className="font-medium truncate hover:text-foreground hover:underline text-left"
                  aria-label="작성자 프로필 보기"
                >
                  {post.user?.name}
                </button>
                {post.user?.role === 'admin' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium shrink-0">
                    관리자
                  </span>
                )}
              </>
            )}
            <span>·</span>
            <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* 조회수 */}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {post.viewCount}
            </span>

            {/* 댓글 수 */}
            {commentCount !== undefined && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                {commentCount}
              </span>
            )}

            {/* 좋아요 */}
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={isTogglingLike}
              className={cn(
                'flex items-center gap-1 text-xs transition-all duration-150 disabled:opacity-50 active:scale-110',
                isLiked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400',
              )}
              aria-label={isLiked ? '좋아요 취소' : '좋아요'}
            >
              {isTogglingLike ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Heart className={cn('w-3 h-3 transition-colors duration-150', isLiked ? 'fill-rose-500' : 'fill-none')} />
              )}
              {likeCount}
            </button>

            {/* 북마크 */}
            {user && (
              <button
                type="button"
                onClick={handleBookmarkClick}
                disabled={isTogglingBookmark}
                className={cn(
                  'flex items-center text-xs transition-all duration-150 disabled:opacity-50 active:scale-110',
                  isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary',
                )}
                aria-label={isBookmarked ? '북마크 해제' : '북마크'}
              >
                {isTogglingBookmark ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Bookmark
                    className={cn(
                      'w-3 h-3 transition-colors duration-150',
                      isBookmarked ? 'fill-primary text-primary' : 'fill-none',
                    )}
                  />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PostCard = memo(PostCardComponent);
