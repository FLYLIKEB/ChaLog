import { FileText, Heart, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserLevel } from '@/types';
import { StatCard } from '@/components/ui/StatCard';
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
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={Star} value={stats.averageRating} label="평균 평점" />
        <StatCard icon={Heart} value={stats.totalLikes.toLocaleString('ko-KR')} label="총 좋아요" />
        <StatCard icon={FileText} value={stats.noteCount} label="작성한 차록" />
      </div>

      {userLevel && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '차록', info: userLevel.noteLevel },
              { label: '게시글', info: userLevel.postLevel },
              { label: '찻장', info: userLevel.cellarLevel },
            ].map(({ label, info }) => (
              <div
                key={label}
                className={cn(
                  'flex flex-col items-center gap-0.5 p-2 rounded-lg bg-muted/40 text-center',
                )}
              >
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold text-primary">{info.name}</span>
                <span className="text-xs text-muted-foreground">Lv.{info.level}</span>
              </div>
            ))}
          </div>

          <Link to="/badges" className="flex items-center justify-between group">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {userLevel.badges.length > 0 ? (
                userLevel.badges.map((b) => (
                  <span
                    key={b.id}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {b.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">뱃지를 획득해보세요</span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}
