import React, { type FC } from 'react';
import { Star, Sparkles } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from './ui/card';
import { TeaTypeBadge } from './TeaTypeBadge';

interface TeaNewCardProps {
  tea: Tea;
}

export const TeaNewCard: FC<TeaNewCardProps> = ({ tea }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full h-full text-left p-3 min-h-[120px] flex flex-col overflow-hidden card-appearance-hover transition-shadow cursor-pointer border-l-4 border-l-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary shrink-0">
              <Sparkles className="w-3 h-3" />
              NEW
            </span>
            <h3 className="truncate font-medium text-foreground">{tea.name}</h3>
            {tea.type && <TeaTypeBadge type={tea.type} className="shrink-0" />}
          </div>
          <div className="flex flex-col gap-0.5 mt-1.5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm truncate whitespace-nowrap">
              <span className={!tea.year ? 'text-muted-foreground/50' : undefined}>
                {tea.year ? `${tea.year}년` : '연도미상'}
              </span>
              <span>
                <span className={!(tea.price != null && tea.price > 0) ? 'text-muted-foreground/50' : undefined}>
                  {tea.price != null && tea.price > 0 ? `${tea.price.toLocaleString()}원` : '가격미상'}
                </span>
                <span className={!(tea.weight != null && tea.weight > 0) ? 'text-muted-foreground/50' : undefined}>
                  {tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ' · 용량미상'}
                </span>
              </span>
              {tea.seller ? (
                <Link
                  to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-primary hover:underline"
                >
                  {tea.seller}
                </Link>
              ) : (
                <span className="text-muted-foreground/50">판매처 미상</span>
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
