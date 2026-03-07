import React, { useEffect, useState, useCallback } from 'react';
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
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';

export function Saved() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarkedNotes = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const notes = await notesApi.getAll(undefined, undefined, undefined, true);
      const notesArray = Array.isArray(notes) ? notes : [];
      setBookmarkedNotes(notesArray as Note[]);
    } catch (error) {
      logger.error('Failed to fetch bookmarked notes:', error);
      toast.error('저장한 차록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchBookmarkedNotes();
  }, [isAuthenticated, user, authLoading, navigate, fetchBookmarkedNotes]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    if (isAuthenticated && user) {
      registerRefresh(fetchBookmarkedNotes);
    } else {
      registerRefresh(undefined);
    }
    return () => registerRefresh(undefined);
  }, [registerRefresh, fetchBookmarkedNotes, isAuthenticated, user]);

  // 북마크 해제 시 리스트에서 제거
  const handleBookmarkRemoved = (noteId: number) => {
    setBookmarkedNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
  };

  // 인증 로딩 중 또는 리다이렉트 중
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header showBack showProfile title="📌 저장함" />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Section title="📌 저장한 차록" spacing="lg">
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
            <EmptyState
              type="notes"
              message="아직 저장한 차록이 없어요."
              action={{ label: '🔍 사색하기', onClick: () => navigate('/sasaek') }}
            />
          )}
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}

