import { useNavigate } from 'react-router-dom';
import { NoteCard } from '../NoteCard';
import { EmptyState } from '../EmptyState';
import { Note } from '../../types';

interface ForYouFeedProps {
  notes: Note[];
}

export function ForYouFeed({ notes }: ForYouFeedProps) {
  const navigate = useNavigate();

  const displayNotes = notes.slice(0, 6);

  if (displayNotes.length > 0) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {displayNotes.map((note, i) => (
          <div
            key={note.id}
            className="shrink-0 w-[calc((100%-8px)/3)] md:w-[calc((100%-16px)/4)] snap-start animate-fade-in-up opacity-0"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <NoteCard note={note} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <EmptyState
      type="feed"
      message="아직 등록된 차록이 없어요. 첫 차록을 남겨볼까요?"
      action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
    />
  );
}
