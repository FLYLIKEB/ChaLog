import { useNavigate } from 'react-router-dom';
import { BarChart2, Bookmark } from 'lucide-react';
import { Note } from '@/types';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortType = 'latest' | 'rating';

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

  return (
    <>
      {notes.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">총 {noteTotal}개</span>
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="rating">별점순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Section
        title="차록"
        spacing="lg"
        headerAction={
          isOwnProfile ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/report')}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <BarChart2 className="w-4 h-4" />
                레포트
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/saved')}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Bookmark className="w-4 h-4" />
                저장함
              </Button>
            </div>
          ) : undefined
        }
      >
        {notes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} showTeaName />
              ))}
            </div>
            <InfiniteScrollSentinel
              onLoadMore={onLoadMore}
              loading={isLoadingMore}
              hasMore={hasMore}
            />
          </>
        ) : (
          <EmptyState
            type="notes"
            message="아직 작성한 차록이 없어요."
            action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
          />
        )}
      </Section>
    </>
  );
}
