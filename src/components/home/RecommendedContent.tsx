import { Note } from '@/types';
import { NoteCard } from '@/components/NoteCard';

interface RecommendedContentProps {
  notes: Note[];
}

export function RecommendedContent({ notes }: RecommendedContentProps) {
  const topNotes = notes.slice(0, 12);
  if (topNotes.length === 0) return null;

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3">
      {topNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
