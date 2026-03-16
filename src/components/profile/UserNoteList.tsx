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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
      {/* Tab bar - Instagram style */}
      <div className="flex border-b border-border/40">
        <button
          type="button"
          onClick={() => setActiveTab('grid')}
          className={cn(
            'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
            activeTab === 'grid'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground'
          )}
          aria-label="그리드 보기"
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        {isOwnProfile && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={cn(
                'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
                activeTab === 'report'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground'
              )}
              aria-label="레포트"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={cn(
                'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
                activeTab === 'saved'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground'
              )}
              aria-label="저장함"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Note grid */}
      {activeTab === 'grid' && (
        <>
          {/* Sort control */}
          {notes.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-muted-foreground">{noteTotal}개의 차록</span>
              <Select value={sort} onValueChange={(v) => onSortChange(v as SortType)}>
                <SelectTrigger className="w-24 h-7 text-xs border-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="rating">별점순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {notes.length > 0 ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3 px-2 md:px-4">
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
            <div className="px-4 py-8">
              <EmptyState
                type="notes"
                message="아직 작성한 차록이 없어요."
                action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
              />
            </div>
          )}
        </>
      )}

      {/* Report tab */}
      {activeTab === 'report' && <ReportContent />}

      {/* Saved tab */}
      {activeTab === 'saved' && <SavedContent />}
    </div>
  );
}
