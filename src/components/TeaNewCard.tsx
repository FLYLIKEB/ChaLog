import React, { type FC } from 'react';
import { Star, Sparkles } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from './ui/card';

interface TeaNewCardProps {
  tea: Tea;
}

export const TeaNewCard: FC<TeaNewCardProps> = ({ tea }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-shadow cursor-pointer border-l-4 border-l-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary">
              <Sparkles className="w-3 h-3" />
              NEW
            </span>
            <h3 className="truncate font-medium text-foreground">{tea.name}</h3>
          </div>
          <div className="flex flex-col gap-0.5 mt-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>{tea.type}</span>
              {tea.year && <span>{tea.year}년</span>}
              {tea.price != null && tea.price > 0 && (
                <span>
                  {tea.price.toLocaleString()}원
                  {tea.weight != null && tea.weight > 0 && ` · ${tea.weight}g`}
                </span>
              )}
              {tea.seller && (
                <Link
                  to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-primary hover:underline"
                >
                  {tea.seller}
                </Link>
              )}
            </div>
            {tea.price != null && tea.price > 0 && tea.weight != null && tea.weight > 0 && (
              <span className="text-xs text-muted-foreground">정확한 정보가 아닐 수 있습니다</span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-rating text-rating" />
            <span className="text-sm font-medium">{Number(tea.averageRating).toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{tea.reviewCount}개 차록</span>
        </div>
      </div>
    </Card>
  );
};
