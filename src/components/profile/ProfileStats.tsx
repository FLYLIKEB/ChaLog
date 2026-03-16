import { useNavigate } from 'react-router-dom';
import { ChevronRight, Heart, Star } from 'lucide-react';
import { UserLevel } from '@/types';
import { cn } from '@/components/ui/utils';

interface ProfileStatsData {
  averageRating: number;
  totalLikes: number;
  noteCount: number;
}

interface ProfileStatsProps {
  stats: ProfileStatsData;
  userLevel: UserLevel | null;
}

export function ProfileStats({ stats, userLevel }: ProfileStatsProps) {
  const navigate = useNavigate();

  if (!userLevel && stats.averageRating === 0 && stats.totalLikes === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border/40 space-y-2">
      {/* Compact stats row */}
      <div className="flex items-center justify-around">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-rating text-rating" />
          <span className="text-xs font-medium text-foreground">{stats.averageRating}</span>
          <span className="text-xs text-muted-foreground">평균</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-medium text-foreground">{stats.totalLikes.toLocaleString('ko-KR')}</span>
          <span className="text-xs text-muted-foreground">좋아요</span>
        </div>
      </div>

      {/* Level & Badge row - tappable */}
      {userLevel && (
        <button
          type="button"
          onClick={() => navigate('/badges')}
          className="w-full flex items-center justify-between py-1.5 group"
        >
          <div className="flex items-center gap-3">
            {[
              { label: '차록', info: userLevel.noteLevel },
              { label: '게시글', info: userLevel.postLevel },
              { label: '찻장', info: userLevel.cellarLevel },
            ].map(({ label, info }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="text-xs font-semibold text-primary">Lv.{info.level}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      )}

      {userLevel && (
        <button
          type="button"
          onClick={() => navigate('/badges')}
          className="flex flex-wrap gap-1.5 w-full group"
        >
          {userLevel.badges.length > 0 ? (
            userLevel.badges.map((b) => (
              <span
                key={b.id}
                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
              >
                {b.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">뱃지를 획득해보세요</span>
          )}
        </button>
      )}
    </div>
  );
}
