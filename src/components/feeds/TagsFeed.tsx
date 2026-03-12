import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Loader2, Hash } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { EmptyState } from '../EmptyState';
import { Button } from '../ui/button';
import { Note, PopularTagItem } from '../../types';
import { cn } from '../ui/utils';
import { CARD_WIDTH, CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES } from '../../constants';

interface TagsFeedProps {
  notes: Note[];
  followedTags: PopularTagItem[];
  isLoading: boolean;
  isLoggedIn: boolean;
  authLoading: boolean;
}

export function TagsFeed({ notes, followedTags, isLoading, isLoggedIn, authLoading }: TagsFeedProps) {
  const navigate = useNavigate();

  if (!isLoggedIn && !authLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          구독한 향미 차록을 보려면 로그인이 필요합니다.
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

  return (
    <>
      {followedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-border/50">
          {followedTags.map((tag) => (
            <Link
              key={tag.name}
              to={`/tag/${encodeURIComponent(tag.name)}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Hash className="w-3 h-3" />
              {tag.name}
            </Link>
          ))}
        </div>
      )}
      {notes.length > 0 ? (
        <div className={CARD_CONTAINER_CLASSES}>
          {notes.map((note) => (
            <div key={note.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
              <NoteCard note={note} showTeaName />
            </div>
          ))}
        </div>
      ) : followedTags.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <Hash className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">
            구독한 향미가 없습니다.
          </p>
          <p className="text-xs text-muted-foreground">
            향미를 클릭해 상세 페이지에서 구독해 보세요!
          </p>
        </div>
      ) : (
        <EmptyState
          type="feed"
          message="구독한 테마의 공개 차록이 없어요."
          action={{ label: '테마 탐색하기', onClick: () => navigate('/sasaek') }}
        />
      )}
    </>
  );
}
