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
  const [isSwiped, setIsSwiped] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [translateX, setTranslateX] = useState(0);

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
    <div className="relative overflow-hidden">
      {/* 북마크 버튼 배경 (스와이프 시 보임) */}
      {user && (
        <div 
          className={cn(
            "absolute right-0 top-0 bottom-0 flex items-center justify-center bg-primary/10 transition-opacity duration-200 z-10",
            isSwiped ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: '80px' }}
        >
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
      
      <div
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role={canView ? 'button' : undefined}
        tabIndex={canView ? 0 : undefined}
        className={cn(
          "w-full text-left py-1 px-0 transition-transform duration-200 cursor-pointer relative",
          "bg-card text-card-foreground",
          "border-b border-border/50 last:border-b-0",
          canView ? 'hover:bg-muted/20' : 'opacity-60 cursor-not-allowed'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* 이미지 썸네일 */}
        <div className="shrink-0 rounded-lg overflow-hidden bg-gray-100 w-28 h-auto sm:w-32 sm:h-auto mt-3 self-stretch">
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
          <div className="flex items-center justify-between gap-3 mt-2">
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
            
            {/* 좋아요 수만 표시 */}
            {user && likeCount > 0 && (
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
    </div>
  );
};

export const NoteCard = memo(NoteCardComponent);
