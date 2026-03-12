import { useNavigate } from 'react-router-dom';
import { NoteCard } from '../NoteCard';
import { EmptyState } from '../EmptyState';
import { Note } from '../../types';
import { cn } from '../ui/utils';
import { CARD_WIDTH, CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES } from '../../constants';

interface ForYouFeedProps {
  notes: Note[];
}

export function ForYouFeed({ notes }: ForYouFeedProps) {
  const navigate = useNavigate();

  if (notes.length > 0) {
    return (
      <div className={CARD_CONTAINER_CLASSES}>
        {notes.map((note, i) => (
          <div
            key={note.id}
            className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE, 'animate-fade-in-up opacity-0')}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <NoteCard note={note} showTeaName />
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
