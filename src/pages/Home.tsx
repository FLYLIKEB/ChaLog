import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { TeaCard } from '../components/TeaCard';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { teasApi, notesApi } from '../lib/api';
import { Tea, Note } from '../types';
import { logger } from '../lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Home() {
  const [todayTea, setTodayTea] = useState<Tea | null>(null);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Promise.allSettled를 사용하여 일부 API가 실패해도 다른 데이터는 표시
        const [teasResult, notesResult] = await Promise.allSettled([
          teasApi.getAll(),
          notesApi.getAll(undefined, true),
        ]);

        // Teas 처리
        if (teasResult.status === 'fulfilled') {
          const teasArray = Array.isArray(teasResult.value) ? teasResult.value : [];
          if (teasArray.length > 0) {
            const randomIndex = Math.floor(Math.random() * teasArray.length);
            setTodayTea(teasArray[randomIndex]);
          }
        } else {
          const error = teasResult.reason;
          logger.error('Failed to fetch teas:', error);
          // 429 에러는 특별한 메시지 표시
          if (error?.statusCode === 429) {
            toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          } else {
            toast.error('차 정보를 불러오는데 실패했습니다.');
          }
        }

        // Notes 처리
        if (notesResult.status === 'fulfilled') {
          const notesArray = Array.isArray(notesResult.value) ? notesResult.value : [];
          setPublicNotes(notesArray as Note[]);
        } else {
          const error = notesResult.reason;
          logger.error('Failed to fetch notes:', error);
          // 429 에러는 특별한 메시지 표시
          if (error?.statusCode === 429) {
            toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          } else {
            toast.error('노트 정보를 불러오는데 실패했습니다.');
          }
        }
      } catch (error) {
        logger.error('Failed to fetch data:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showProfile />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* 오늘의 차 섹션 */}
        <Section title="오늘의 차" spacing="lg">
          {todayTea ? (
            <TeaCard tea={todayTea} />
          ) : (
            <EmptyState type="feed" message="등록된 차가 없습니다." />
          )}
        </Section>

        {/* 공개 노트 섹션 */}
        <Section title="공개 노트" spacing="lg">
          {publicNotes.length > 0 ? (
            <div className="space-y-4">
              {publicNotes.map(note => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  showTeaName 
                />
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 등록된 노트가 없습니다." />
          )}
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}
