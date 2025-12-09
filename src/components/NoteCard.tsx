import React, { type FC, useState, memo } from 'react';
import { Star, Lock, Heart, Bookmark } from 'lucide-react';
import { Note } from '../types';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { notesApi } from '../lib/api';
import { logger } from '../lib/logger';
import { Card } from './ui/card';
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
    <Card
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={canView ? 'button' : undefined}
      tabIndex={canView ? 0 : undefined}
      className={cn(
        "w-full text-left p-4 transition-shadow cursor-pointer",
        canView ? 'hover:shadow-md' : 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className="space-y-3">
        {/* 이미지 */}
        {hasImage && firstImage && (
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <ImageWithFallback
              src={firstImage}
              alt="Note image"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* 내용 영역 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {showTeaName && (
              <h3 className="truncate mb-1 text-primary">{note.teaName}</h3>
            )}
            {note.memo && (
              <p className="text-sm text-muted-foreground line-clamp-2">{note.memo}</p>
            )}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs sm:text-sm px-3 py-1.5 bg-muted text-foreground rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="text-xs sm:text-sm px-3 py-1.5 text-muted-foreground font-medium">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  navigate(`/user/${note.userId}`);
                }}
                className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors"
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
          </div>
          <div className="flex items-center gap-3">
            {note.overallRating !== null && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm">{Number(note.overallRating).toFixed(1)}</span>
              </div>
            )}
            {user && (
              <>
                <button
                  type="button"
                  onClick={handleLikeClick}
                  disabled={isTogglingLike}
                  className={cn(
                    "min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 transition-colors disabled:opacity-50",
                    isLiked 
                      ? 'text-primary hover:text-primary/80' 
                      : 'text-muted-foreground hover:text-primary'
                  )}
                  title={isLiked ? '좋아요 취소' : '좋아요'}
                >
                  <Heart
                    className={cn(
                      "w-5 h-5 transition-all",
                      isLiked 
                        ? 'fill-primary text-primary stroke-primary' 
                        : 'fill-none text-muted-foreground stroke-muted-foreground'
                    )}
                  />
                  {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
                </button>
                <button
                  type="button"
                  onClick={handleBookmarkClick}
                  disabled={isTogglingBookmark}
                  className={cn(
                    "min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 transition-colors disabled:opacity-50",
                    isBookmarked 
                      ? 'text-primary hover:text-primary/80' 
                      : 'text-muted-foreground hover:text-primary'
                  )}
                  title={isBookmarked ? '북마크 해제' : '북마크 추가'}
                >
                  <Bookmark
                    className={cn(
                      "w-5 h-5 transition-all",
                      isBookmarked 
                        ? 'fill-primary text-primary stroke-primary' 
                        : 'fill-none text-muted-foreground stroke-muted-foreground'
                    )}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const NoteCard = memo(NoteCardComponent);
