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
  1: { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: '🥇' },
  2: { bg: 'bg-slate-400/20', text: 'text-slate-600 dark:text-slate-300', icon: '🥈' },
  3: { bg: 'bg-amber-700/20', text: 'text-amber-800 dark:text-amber-600', icon: '🥉' },
};

export const TeaRankingCard: FC<TeaRankingCardProps> = ({ tea, rank }) => {
  const navigate = useNavigate();
  const style = RANK_STYLES[rank] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground' };

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-3 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 min-h-0"
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
          <h3 className="truncate font-medium text-primary text-sm">{tea.name}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs truncate">
            <span>{tea.type}</span>
            {tea.year && <span>{tea.year}년</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{Number(tea.averageRating).toFixed(1)}</span>
        </div>
        <span className="text-muted-foreground">{tea.reviewCount}개 리뷰</span>
      </div>
    </Card>
  );
};
