import React, { type FC } from 'react';
import { Star, Sparkles } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';

interface TeaNewCardProps {
  tea: Tea;
}

export const TeaNewCard: FC<TeaNewCardProps> = ({ tea }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary">
              <Sparkles className="w-3 h-3" />
              NEW
            </span>
            <h3 className="truncate font-medium text-primary">{tea.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground text-sm">
            <span>{tea.type}</span>
            {tea.year && <span>{tea.year}년</span>}
            {tea.seller && <span className="truncate">{tea.seller}</span>}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-rating text-rating" />
            <span className="text-sm font-medium">{Number(tea.averageRating).toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{tea.reviewCount}개 리뷰</span>
        </div>
      </div>
    </Card>
  );
};
