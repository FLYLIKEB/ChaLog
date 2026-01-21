import React, { type FC, useState, memo } from 'react';
import { Star, Lock, Heart, Bookmark, Loader2 } from 'lucide-react';
import teaCupSvg from '../assets/tea-cup.svg';
import { Note } from '../types';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { notesApi } from '../lib/api';
import { logger } from '../lib/logger';
import { cn } from './ui/utils';

interface NoteCardProps {
  note: Note;
  showTeaName?: boolean;
  onBookmarkToggle?: (isBookmarked: boolean) => void;
}

const NoteCardComponent: FC<NoteCardProps> = ({ note, showTeaName = false, onBookmarkToggle }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasImage = note.images && note.images.length > 0;
  const firstImage = hasImage ? note.images![0] : null;
  const isMyNote = note.userId === user?.id;
  const canView = note.isPublic || isMyNote;
  
  const [isLiked, setIsLiked] = useState(note.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(note.likeCount ?? 0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(note.isBookmarked ?? false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!canView) {
      toast.error('비공개 노트는 작성자만 볼 수 있습니다.');
      return;
    }
    navigate(`/note/${note.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
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
      const result = await notesApi.toggleLike(note.id);
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (error: any) {
      logger.error('Failed to toggle like:', error);
      toast.error('좋아요 처리에 실패했습니다.');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (isTogglingBookmark) {
      return;
    }

    try {
      setIsTogglingBookmark(true);
      const result = await notesApi.toggleBookmark(note.id);
      setIsBookmarked(result.bookmarked);
      // 북마크 토글 콜백 호출
      if (onBookmarkToggle) {
        onBookmarkToggle(result.bookmarked);
      }
    } catch (error: any) {
      logger.error('Failed to toggle bookmark:', error);
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      role={canView ? 'button' : undefined}
      tabIndex={canView ? 0 : undefined}
      className={cn(
        "w-full text-left py-1 px-0 transition-colors cursor-pointer",
        "bg-card text-card-foreground",
        "border-b border-border/50 last:border-b-0",
        canView ? 'hover:bg-muted/20' : 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* 이미지 썸네일 */}
        <div className="shrink-0 rounded-lg overflow-hidden bg-gray-100 w-28 h-28 sm:w-32 sm:h-32 mt-3">
          {hasImage && firstImage ? (
            <ImageWithFallback
              src={firstImage}
              alt="Note image"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img src={teaCupSvg} alt="Tea cup" className="w-10 h-10 opacity-40" />
            </div>
          )}
        </div>
        
        {/* 내용 영역 */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* 상단: 제목/메모 */}
          <div className="flex-1 min-w-0 mt-3">
            {showTeaName && (
              <h3 className="truncate mb-1.5 text-primary font-medium text-base">{note.teaName}</h3>
            )}
            {note.memo && (
              <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">{note.memo}</p>
            )}
          </div>

          {/* 별점 */}
          {note.overallRating !== null && (
            <div className="flex items-center gap-1.5 -mt-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">{Number(note.overallRating).toFixed(1)}</span>
            </div>
          )}

          {/* 태그 */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-0">
              {note.tags.slice(0, 5).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2.5 py-1 bg-muted text-foreground rounded-full font-medium"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 5 && (
                <span className="text-xs px-2.5 py-1 text-muted-foreground font-medium">
                  +{note.tags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* 하단: 사용자 정보와 액션 버튼 */}
          <div className="flex items-center justify-between gap-3 -mt-3">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  navigate(`/user/${note.userId}`);
                }}
                className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors font-medium underline-offset-2 hover:underline"
                aria-label={`${note.userName}의 프로필 보기`}
              >
                {note.userName}
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {note.createdAt.toLocaleDateString('ko-KR')}
              </span>
              {!note.isPublic && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </>
              )}
            </div>
            
            {/* 좋아요/북마크 버튼 */}
            {user && (
              <div className={cn(
                "flex items-center gap-1.5 shrink-0 transition-opacity duration-200",
                isHovered ? 'opacity-100' : 'opacity-0'
              )}>
                <button
                  type="button"
                  onClick={handleLikeClick}
                  disabled={isTogglingLike}
                  className={cn(
                    "min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 px-1 transition-colors disabled:opacity-50 rounded-md",
                    isLiked 
                      ? 'text-primary hover:text-primary/80 hover:bg-primary/5' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  )}
                  title={isLiked ? '좋아요 취소' : '좋아요'}
                  aria-label={isLiked ? '좋아요 취소' : '좋아요'}
                >
                  {isTogglingLike ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Heart
                        className={cn(
                          "w-4 h-4 transition-all",
                          isLiked 
                            ? 'fill-primary text-primary stroke-primary' 
                            : 'fill-none text-muted-foreground stroke-muted-foreground'
                        )}
                      />
                      {likeCount > 0 && <span className="text-xs font-medium min-w-[1rem] text-center">{likeCount}</span>}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBookmarkClick}
                  disabled={isTogglingBookmark}
                  className={cn(
                    "min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors disabled:opacity-50 rounded-md",
                    isBookmarked 
                      ? 'text-primary hover:text-primary/80 hover:bg-primary/5' 
                      : 'text-muted-foreground hover:text-primary hover:bg-muted/50'
                  )}
                  title={isBookmarked ? '북마크 해제' : '북마크 추가'}
                  aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
                >
                  {isTogglingBookmark ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Bookmark
                      className={cn(
                        "w-4 h-4 transition-all",
                        isBookmarked 
                          ? 'fill-primary text-primary stroke-primary' 
                          : 'fill-none text-muted-foreground stroke-muted-foreground'
                      )}
                    />
                  )}
                </button>
              </div>
            )}
            {/* 좋아요 수만 표시 (호버되지 않았을 때) */}
            {user && !isHovered && likeCount > 0 && (
              <div className="flex items-center shrink-0">
                <span className="text-xs text-muted-foreground">
                  <Heart className="w-3 h-3 inline fill-none stroke-muted-foreground mr-0.5" />
                  {likeCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NoteCard = memo(NoteCardComponent);
