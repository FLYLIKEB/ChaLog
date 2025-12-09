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
        const [teas, notes] = await Promise.all([
          teasApi.getAll(),
          notesApi.getAll(undefined, true),
        ]);

        const teasArray = Array.isArray(teas) ? teas : [];
        const notesArray = Array.isArray(notes) ? notes : [];

        // 랜덤 차 선택
        if (teasArray.length > 0) {
          const randomIndex = Math.floor(Math.random() * teasArray.length);
          setTodayTea(teasArray[randomIndex]);
        }

        // API 레이어에서 이미 정규화 및 날짜 변환이 완료됨
        setPublicNotes(notesArray as Note[]);
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
      
      <div className="p-6 space-y-6">
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
            <div className="space-y-3">
              {publicNotes.map(note => (
                <NoteCard key={note.id} note={note} showTeaName />
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
