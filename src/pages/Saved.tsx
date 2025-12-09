import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { notesApi } from '../lib/api';
import { Note } from '../types';
import { logger } from '../lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function Saved() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 인증 로딩이 완료될 때까지 기다림
    if (authLoading) {
      return;
    }

    // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchBookmarkedNotes = async () => {
      try {
        setIsLoading(true);
        const notes = await notesApi.getAll(undefined, undefined, undefined, true);
        const notesArray = Array.isArray(notes) ? notes : [];
        setBookmarkedNotes(notesArray as Note[]);
      } catch (error) {
        logger.error('Failed to fetch bookmarked notes:', error);
        toast.error('저장한 노트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarkedNotes();
  }, [isAuthenticated, user, authLoading, navigate]);

  // 북마크 해제 시 리스트에서 제거
  const handleBookmarkRemoved = (noteId: number) => {
    setBookmarkedNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
  };

  // 인증 로딩 중 또는 리다이렉트 중
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showProfile title="저장함" />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Section title="저장한 노트" spacing="lg">
          {bookmarkedNotes.length > 0 ? (
            <div className="space-y-3">
              {bookmarkedNotes.map(note => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  showTeaName 
                  onBookmarkToggle={(isBookmarked) => {
                    if (!isBookmarked) {
                      handleBookmarkRemoved(note.id);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState type="notes" message="아직 저장한 노트가 없습니다." />
          )}
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}

