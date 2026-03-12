import React, { type FC, useState, memo } from 'react';
import { Star, Lock, Bookmark, Loader2 } from 'lucide-react';
import { Note } from '../types';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { notesApi } from '../lib/api';
import { logger } from '../lib/logger';
import { cn } from './ui/utils';
import { TeaTypeBadge } from './TeaTypeBadge';

interface NoteCardProps {
  note: Note;
  showTeaName?: boolean;
  onBookmarkToggle?: (isBookmarked: boolean) => void;
}

const NoteCardComponent: FC<NoteCardProps> = ({ note, showTeaName = false, onBookmarkToggle }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasImage = note.images && note.images.length > 0;
  const firstImage = hasImage
    ? (note.imageThumbnails?.[0] ?? note.images![0])
    : null;
  const isMyNote = note.userId === user?.id;
  const canView = note.isPublic || isMyNote;
  
  const [isLiked, setIsLiked] = useState(note.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(note.likeCount ?? 0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(note.isBookmarked ?? false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [translateX, setTranslateX] = useState(0);

  const handleClick = () => {
    if (!canView) {
      toast.error('비공개 차록은 작성자만 볼 수 있습니다.');
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
      // 북마크 후 스와이프 상태 해제
      setIsSwiped(false);
    } catch (error: any) {
      logger.error('Failed to toggle bookmark:', error);
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // 수평 스와이프가 수직 스와이프보다 큰 경우
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 왼쪽으로 스와이프 (음수)
      if (deltaX < 0) {
        const swipeAmount = Math.max(deltaX, -80); // 최대 -80px
        setTranslateX(swipeAmount);
        
        // 스와이프가 충분히 멀리 갔을 때 북마크 표시
        if (deltaX < -50) {
          setIsSwiped(true);
        }
      } else {
        // 오른쪽으로 스와이프하면 원래 위치로
        setTranslateX(0);
        setIsSwiped(false);
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    
    // 스와이프가 충분히 멀리 갔으면 북마크 표시 상태 유지
    if (translateX < -50) {
      setIsSwiped(true);
      setTranslateX(-80); // 북마크 버튼이 보이도록 고정
    } else {
      // 충분히 멀리 가지 않았으면 원래 위치로 복귀
      setIsSwiped(false);
      setTranslateX(0);
    }
    
    // 스와이프 후 일정 시간 후 자동으로 원래 상태로 복귀
    if (isSwiped && translateX < -50) {
      setTimeout(() => {
        setIsSwiped(false);
        setTranslateX(0);
      }, 3000);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 북마크 버튼이 표시된 상태에서 카드 클릭 시 스와이프 해제
    if (isSwiped) {
      setIsSwiped(false);
      setTranslateX(0);
      return;
    }
    handleClick();
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden card-appearance h-full w-full',
        'bg-card transition-shadow duration-200',
        canView && 'card-appearance-hover',
        !canView && 'opacity-60'
      )}
    >
      {/* 북마크 버튼 배경 (스와이프 시 보임) */}
      {user && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-r-2xl bg-primary/10 transition-opacity duration-200 z-10',
            isSwiped ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: '80px' }}
        >
          <button
            type="button"
            onClick={handleBookmarkClick}
            disabled={isTogglingBookmark}
            className={cn(
              'min-h-[40px] min-w-[40px] flex items-center justify-center transition-all duration-150 disabled:opacity-50 rounded-full active:scale-95',
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
                  'w-4 h-4 transition-all duration-150',
                  isBookmarked
                    ? 'fill-primary text-primary stroke-primary'
                    : 'fill-none text-muted-foreground stroke-muted-foreground'
                )}
              />
            )}
          </button>
        </div>
      )}

      <div
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role={canView ? 'button' : undefined}
        tabIndex={canView ? 0 : undefined}
        className={cn(
          'w-full h-full text-left p-4 transition-transform duration-200 cursor-pointer relative',
          canView ? 'hover:bg-muted/5' : 'cursor-not-allowed'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div className="flex items-center gap-3">
          {/* 내용 영역 */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
            {showTeaName && (
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="truncate text-foreground font-semibold text-sm">
                  {note.teaName}
                </h3>
                {note.teaType && <TeaTypeBadge type={note.teaType} className="shrink-0" />}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {note.teaYear && (
                <span className="text-xs text-muted-foreground">{note.teaYear}년</span>
              )}
              {note.teaSeller && (
                <span className="text-xs text-muted-foreground truncate">{note.teaSeller}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {note.overallRating !== null && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-rating text-rating shrink-0" />
                  <span className="text-xs font-medium">{Number(note.overallRating).toFixed(1)}</span>
                </div>
              )}
              {!note.isPublic && (
                <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>
          </div>

          {/* 이미지 썸네일 (오른편, 없으면 미표시) */}
          {hasImage && firstImage && (
            <div className="shrink-0 rounded-lg overflow-hidden w-16 h-16">
              <ImageWithFallback
                src={firstImage}
                alt="Note image"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NoteCard = memo(NoteCardComponent);
