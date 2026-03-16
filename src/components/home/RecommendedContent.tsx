import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { notesApi } from '@/lib/api';
import { Note } from '@/types';
import { logger } from '@/lib/logger';
import { cn } from '@/components/ui/utils';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

export function RecommendedContent() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    notesApi.getAll(undefined, true)
      .then((data) => {
        const arr = Array.isArray(data) ? data as Note[] : [];
        setNotes(arr.slice(0, 10));
      })
      .catch((e) => logger.error('Failed to fetch recommended notes:', e));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">추천 차록</span>
        <button
          onClick={() => navigate('/sasaek?tab=explore')}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          더보기
        </button>
      </div>

      {/* Horizontal scroll cards */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {notes.map((note) => {
          const thumbnail = note.imageThumbnails?.[0] ?? note.images?.[0];
          return (
            <button
              key={note.id}
              onClick={() => navigate(`/note/${note.id}`)}
              className="shrink-0 w-36 md:w-40 rounded-2xl bg-card border border-border/30 overflow-hidden text-left hover:shadow-sm transition-shadow active:scale-[0.98]"
            >
              {/* Image or placeholder */}
              <div className="w-full h-24 bg-muted/20">
                {thumbnail ? (
                  <ImageWithFallback
                    src={thumbnail}
                    alt={note.teaName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img src="/logo.png" alt="" className="w-8 h-8 object-contain opacity-20" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-2.5">
                <p className="text-xs font-semibold text-foreground truncate">{note.teaName}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {[note.teaYear ? `${note.teaYear}년` : '*', note.teaSeller || '*'].join(' · ')}
                </p>
                {note.overallRating !== null && Number(note.overallRating) > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    <Star className="w-3 h-3 fill-rating text-rating" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {Number(note.overallRating).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
