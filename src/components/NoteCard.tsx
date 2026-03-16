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
import { TEA_TYPE_COLORS } from '../constants';

interface NoteCardProps {
  note: Note;
  showTeaName?: boolean;
  onBookmarkToggle?: (isBookmarked: boolean) => void;
}

const NoteCardComponent: FC<NoteCardProps> = ({ note, showTeaName = true, onBookmarkToggle }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasImage = note.images && note.images.length > 0;
  const thumbnail = hasImage
    ? (note.imageThumbnails?.[0] ?? note.images![0])
    : null;
  const isMyNote = note.userId === user?.id;
  const canView = note.isPublic || isMyNote;

  const [isBookmarked, setIsBookmarked] = useState(note.isBookmarked ?? false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  const accentClass = note.teaType && note.teaType in TEA_TYPE_COLORS
    ? TEA_TYPE_COLORS[note.teaType as keyof typeof TEA_TYPE_COLORS]
    : 'bg-muted-foreground/50';

  const handleClick = () => {
    if (!canView) {
      toast.error('비공개 차록은 작성자만 볼 수 있습니다.');
      return;
    }
    navigate(`/note/${note.id}`);
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (isTogglingBookmark) return;

    try {
      setIsTogglingBookmark(true);
      const result = await notesApi.toggleBookmark(note.id);
      setIsBookmarked(result.bookmarked);
      if (onBookmarkToggle) {
        onBookmarkToggle(result.bookmarked);
      }
    } catch (error: unknown) {
      logger.error('Failed to toggle bookmark:', error);
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const rating = Number(note.overallRating);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative aspect-[3/4] w-full overflow-hidden flex flex-col rounded-2xl bg-card border border-[var(--card-border)] text-left transition-shadow',
        canView ? 'hover:shadow-md active:scale-[0.98]' : 'opacity-60 cursor-not-allowed',
      )}
    >
      {/* Top: date + lock + bookmark */}
      <div className="flex items-center justify-between p-2.5 pb-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-medium">
            {note.createdAt
              ? new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
              : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!note.isPublic && <Lock className="w-3 h-3 text-muted-foreground" />}
          {user && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleBookmarkClick}
              onKeyDown={(e) => { if (e.key === 'Enter') handleBookmarkClick(e as unknown as React.MouseEvent); }}
              className="p-0.5 rounded-full hover:bg-muted/50 transition-colors"
              aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
            >
              {isTogglingBookmark ? (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              ) : (
                <Bookmark
                  className={cn(
                    'w-3 h-3 transition-colors',
                    isBookmarked
                      ? 'fill-primary text-primary'
                      : 'fill-none text-muted-foreground/40',
                  )}
                />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Center: thumbnail + info */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-2.5">
        {thumbnail ? (
          <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0">
            <ImageWithFallback
              src={thumbnail}
              alt={note.teaName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain opacity-30" />
          </div>
        )}

        {showTeaName && (
          <div className="flex items-center justify-center gap-1 w-full">
            {note.teaType && (
              <span className={cn('w-2 h-2 rounded-full shrink-0', accentClass)} />
            )}
            <span className="text-xs font-medium text-foreground text-center line-clamp-2 leading-tight">
              {note.teaName}
            </span>
          </div>
        )}

        <span className="text-[9px] text-muted-foreground">
          {[note.teaYear ? `${note.teaYear}년` : '*', note.teaSeller || '*'].join(' · ')}
        </span>

        {note.overallRating !== null && rating > 0 && (
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((i) => {
              const filled = i <= Math.floor(rating);
              const half = !filled && i === Math.ceil(rating) && rating % 1 >= 0.3;
              return (
                <Star
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5',
                    filled
                      ? 'fill-rating text-rating'
                      : half
                        ? 'fill-rating/50 text-rating'
                        : 'fill-none text-muted-foreground/25',
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: author name for other users' notes */}
      <div className="pb-2.5 pt-1 flex items-center justify-end px-2.5">
        {!isMyNote && note.userName && (
          <span className="text-[9px] text-muted-foreground/70 truncate max-w-full">
            {note.userName}
          </span>
        )}
      </div>
    </button>
  );
};

export const NoteCard = memo(NoteCardComponent);
