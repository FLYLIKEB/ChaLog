import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { EmptyState } from '../EmptyState';
import { Button } from '../ui/button';
import { Note } from '../../types';
import { cn } from '../ui/utils';
import { CARD_WIDTH, CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES } from '../../constants';

interface FollowingFeedProps {
  notes: Note[];
  isLoading: boolean;
  isLoggedIn: boolean;
  authLoading: boolean;
}

export function FollowingFeed({ notes, isLoading, isLoggedIn, authLoading }: FollowingFeedProps) {
  const navigate = useNavigate();

  if (!isLoggedIn && !authLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          구독한 다우의 차록을 보려면 로그인이 필요합니다.
        </p>
        <Button size="sm" onClick={() => navigate('/login')}>
          로그인하기
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (notes.length > 0) {
    return (
      <div className={CARD_CONTAINER_CLASSES}>
        {notes.map((note) => (
          <div key={note.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
            <NoteCard note={note} showTeaName />
          </div>
        ))}
      </div>
    );
  }

  return (
    <EmptyState
      type="feed"
      message="구독한 다우의 차록이 없어요. 다우를 구독해 보세요!"
      action={{ label: '탐색하기', onClick: () => navigate('/sasaek') }}
    />
  );
}
