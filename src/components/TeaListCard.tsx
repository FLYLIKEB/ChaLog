import { type FC } from 'react';
import { Star } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from './ui/utils';
import { TEA_TYPE_COLORS } from '../constants';

interface TeaListCardProps {
  tea: Tea;
  /** 랭킹 표시 (1~3: 메달, 4+: 숫자) */
  rank?: number;
  /** NEW 뱃지 표시 */
  isNew?: boolean;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export const TeaListCard: FC<TeaListCardProps> = ({ tea, rank, isNew }) => {
  const navigate = useNavigate();
  const rating = Number(tea.averageRating);

  const accentClass = tea.type && tea.type in TEA_TYPE_COLORS
    ? TEA_TYPE_COLORS[tea.type as keyof typeof TEA_TYPE_COLORS]
    : 'bg-muted-foreground/50';

  return (
    <button
      type="button"
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-sm active:scale-[0.99] transition-all text-left"
    >
      {/* 랭킹 또는 NEW 뱃지 */}
      {rank != null && (
        <div className={cn(
          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
          rank <= 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}>
          {RANK_MEDAL[rank] ?? rank}
        </div>
      )}
      {isNew && !rank && (
        <div className="shrink-0 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
          NEW
        </div>
      )}

      {/* 차 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full shrink-0', accentClass)} />
          <span className="text-sm font-medium text-foreground truncate">{tea.name}</span>
          {tea.type && (
            <span className="text-[10px] text-muted-foreground shrink-0">{tea.type}</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground truncate">
          <span className={!tea.year ? 'opacity-40' : undefined}>
            {tea.year ? `${tea.year}년` : '연도미상'}
          </span>
          {tea.seller && (
            <>
              <span className="opacity-30">·</span>
              <Link
                to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-primary/80 hover:underline truncate"
              >
                {tea.seller}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 평점 */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        {rating > 0 && (
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-rating text-rating" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">{tea.reviewCount}개</span>
      </div>
    </button>
  );
};
