import React, { type FC } from 'react';
import { Star } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from './ui/card';
import { TeaTypeBadge } from './TeaTypeBadge';

interface TeaCardProps {
  tea: Tea;
}

export const TeaCard: FC<TeaCardProps> = ({ tea }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-4 h-[120px] flex flex-col overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="truncate font-medium text-foreground">{tea.name}</h3>
            {tea.type && <TeaTypeBadge type={tea.type} className="shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 truncate whitespace-nowrap">
            <span className={!tea.year ? 'text-muted-foreground/50' : undefined}>
              {tea.year ? `${tea.year}년` : '연도미상'}
            </span>
            {' · '}
            <span className={!(tea.price != null && tea.price > 0) ? 'text-muted-foreground/50' : undefined}>
              {tea.price != null && tea.price > 0 ? `${tea.price.toLocaleString()}원` : '가격미상'}
            </span>
            {' · '}
            <span className={!(tea.weight != null && tea.weight > 0) ? 'text-muted-foreground/50' : undefined}>
              {tea.weight != null && tea.weight > 0 ? `${tea.weight}g` : '용량미상'}
            </span>
          </p>
          {tea.price != null && tea.price > 0 && tea.weight != null && tea.weight > 0 && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">정확한 정보가 아닐 수 있습니다</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {tea.seller ? (
              <Link
                to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline"
              >
                {tea.seller}
              </Link>
            ) : (
              <span className="text-muted-foreground/50">판매처 미상</span>
            )}
          </p>
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
