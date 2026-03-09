import React, { type FC } from 'react';
import { Star } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from './ui/card';

interface TeaCardProps {
  tea: Tea;
}

export const TeaCard: FC<TeaCardProps> = ({ tea }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-medium text-foreground">{tea.name}</h3>
          <div className="flex items-center gap-3 mt-2 text-muted-foreground">
            <span className="text-sm">{tea.type}</span>
            {tea.year && <span className="text-sm">{tea.year}년</span>}
            {tea.price != null && tea.price > 0 && (
              <span className="text-sm">
                {tea.price.toLocaleString()}원
                {tea.weight != null && tea.weight > 0 && ` · ${tea.weight}g`}
              </span>
            )}
          </div>
          {tea.price != null && tea.price > 0 && tea.weight != null && tea.weight > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">정확한 정보가 아닐 수 있습니다</p>
          )}
          {tea.seller && (
            <p className="text-sm text-muted-foreground mt-1">
              <Link
                to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline"
              >
                {tea.seller}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-rating text-rating" />
            <span className="text-sm">{Number(tea.averageRating).toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{tea.reviewCount}개 차록</span>
        </div>
      </div>
    </Card>
  );
};
