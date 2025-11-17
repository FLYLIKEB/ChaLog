import React from 'react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { mockTeas, mockNotes } from '../lib/mockData';
import { TeaCard } from '../components/TeaCard';
import { BottomNav } from '../components/BottomNav';

export function Home() {
  // "오늘의 차" 영역에 표시할 랜덤 차 선택 (마운트 시 1회 계산)
  const todayTea = React.useMemo(
    () => mockTeas[Math.floor(Math.random() * mockTeas.length)],
    []
  );
  
  // 공개 노트만 필터링
  const publicNotes = mockNotes.filter(note => note.isPublic);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header showProfile />
      
      <div className="p-4 space-y-6">
        {/* 오늘의 차 섹션 */}
        <section>
          <h2 className="mb-3">오늘의 차</h2>
          <TeaCard tea={todayTea} />
        </section>

        {/* 공개 노트 섹션 */}
        <section>
          <h2 className="mb-3">공개 노트</h2>
          {publicNotes.length > 0 ? (
            <div className="space-y-3">
              {publicNotes.map(note => (
                <NoteCard key={note.id} note={note} showTeaName />
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 등록된 노트가 없습니다." />
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
