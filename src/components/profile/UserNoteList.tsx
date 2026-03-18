import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Bookmark, Grid3X3 } from 'lucide-react';
import { useState } from 'react';
import { Note } from '@/types';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { cn } from '@/components/ui/utils';
import { ReportContent } from './ReportContent';
import { SavedContent } from './SavedContent';

type SortType = 'latest' | 'rating';
type TabType = 'grid' | 'report' | 'saved';

interface UserNoteListProps {
  notes: Note[];
  noteTotal: number;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isOwnProfile: boolean;
}

export function UserNoteList({
  notes,
  noteTotal,
  sort,
  onSortChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isOwnProfile,
}: UserNoteListProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('grid');

  return (
    <div>
      {/* Tab bar — sticky, icon + text labels */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex">
          <TabButton
            active={activeTab === 'grid'}
            onClick={() => setActiveTab('grid')}
            icon={<Grid3X3 className="w-4 h-4" />}
            label="차록"
          />
          {isOwnProfile && (
            <>
              <TabButton
                active={activeTab === 'report'}
                onClick={() => setActiveTab('report')}
                icon={<BarChart2 className="w-4 h-4" />}
                label="레포트"
              />
              <TabButton
                active={activeTab === 'saved'}
                onClick={() => setActiveTab('saved')}
                icon={<Bookmark className="w-4 h-4" />}
                label="저장함"
              />
            </>
          )}
        </div>
      </div>

      {/* Grid tab */}
      {activeTab === 'grid' && (
        <>
          {notes.length > 0 ? (
            <>
              {/* Sort pills */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-xs text-muted-foreground">{noteTotal}개</span>
                <div className="flex items-center gap-0.5 bg-muted/60 rounded-full p-0.5">
                  {(['latest', 'rating'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSortChange(s)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-all duration-150',
                        sort === s
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {s === 'latest' ? '최신순' : '별점순'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 px-2 md:px-4 pb-6">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
              <InfiniteScrollSentinel
                onLoadMore={onLoadMore}
                loading={isLoadingMore}
                hasMore={hasMore}
              />
            </>
          ) : (
            <div className="px-4 py-12">
              <EmptyState
                type="notes"
                message="아직 작성한 차록이 없어요."
                action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'report' && <ReportContent />}
      {activeTab === 'saved' && <SavedContent />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2',
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground/70',
      )}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span className={cn(
          'text-[10px] font-semibold',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {badge > 999 ? '999+' : badge}
        </span>
      )}
    </button>
  );
}
