import React, { type FC } from 'react';
import { Star } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { cn } from './ui/utils';

interface TeaRankingCardProps {
  tea: Tea;
  rank: number;
}

const RANK_STYLES: Record<number, { bg: string; text: string; icon?: string }> = {
  1: { bg: 'bg-rating/20', text: 'text-rating', icon: '🥇' },
  2: { bg: 'bg-muted-foreground/20', text: 'text-muted-foreground', icon: '🥈' },
  3: { bg: 'bg-rating/30', text: 'text-rating', icon: '🥉' },
};

export const TeaRankingCard: FC<TeaRankingCardProps> = ({ tea, rank }) => {
  const navigate = useNavigate();
  const style = RANK_STYLES[rank] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground' };

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer flex flex-col gap-2 min-h-0"
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs',
            style.bg,
            style.text,
          )}
        >
          {style.icon ?? rank}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-medium text-foreground text-sm">{tea.name}</h3>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs truncate">
              <span>{tea.type}</span>
              {tea.year && <span>{tea.year}년</span>}
              {tea.price != null && tea.price > 0 && (
                <span>
                  {tea.price.toLocaleString()}원
                  {tea.weight != null && tea.weight > 0 && ` · ${tea.weight}g`}
                </span>
              )}
            </div>
            {tea.price != null && tea.price > 0 && tea.weight != null && tea.weight > 0 && (
              <span className="text-[10px] text-muted-foreground/80">정확한 정보가 아닐 수 있습니다</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-rating text-rating" />
          <span className="font-medium">{Number(tea.averageRating).toFixed(1)}</span>
        </div>
        <span className="text-muted-foreground">{tea.reviewCount}개 차록</span>
      </div>
    </Card>
  );
};
