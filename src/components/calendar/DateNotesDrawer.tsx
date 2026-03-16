import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, PenLine } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { NoteCard } from '@/components/NoteCard';
import { NoteCardSkeleton } from '@/components/NoteCardSkeleton';
import { formatDateLabel } from '@/utils/dateUtils';
import type { Note } from '@/types';

interface DateNotesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  notes: Note[];
  isLoading: boolean;
}

export function DateNotesDrawer({ open, onOpenChange, selectedDate, notes, isLoading }: DateNotesDrawerProps) {
  const navigate = useNavigate();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div>
            <DrawerTitle className="text-base font-semibold">
              {selectedDate ? formatDateLabel(selectedDate) : ''}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              선택한 날짜의 차록 목록
            </DrawerDescription>
          </div>
          <button
            onClick={() => {
              onOpenChange(false);
              navigate('/note/new');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            기록 추가
          </button>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 py-4 pb-24">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((i) => (
                <NoteCardSkeleton key={i} />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-muted-foreground">이 날의 차록이 없습니다.</p>
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate('/note/new');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <PenLine className="w-3.5 h-3.5" />
                차록 작성하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
