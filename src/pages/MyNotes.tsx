import React, { useState } from 'react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { mockNotes, currentUser } from '../lib/mockData';
import { BottomNav } from '../components/BottomNav';

type FilterType = 'all' | 'public' | 'private';
type SortType = 'latest' | 'rating';

export function MyNotes() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('latest');

  // 현재 사용자 노트 목록 가져오기
  let myNotes = mockNotes.filter(note => note.userId === currentUser.id);

  // 필터 조건 적용
  if (filter === 'public') {
    myNotes = myNotes.filter(note => note.isPublic);
  } else if (filter === 'private') {
    myNotes = myNotes.filter(note => !note.isPublic);
  }

  // 정렬 조건 적용
  myNotes = [...myNotes].sort((a, b) => {
    if (sort === 'latest') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else {
      return b.rating - a.rating;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="내 노트" />
      
      <div className="p-4 space-y-4">
        {/* 필터 탭 */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="public">공개</TabsTrigger>
            <TabsTrigger value="private">비공개</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 정렬 드롭다운 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            총 {myNotes.length}개
          </span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="rating">별점순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 노트 목록 */}
        {myNotes.length > 0 ? (
          <div className="space-y-3">
            {myNotes.map(note => (
              <NoteCard key={note.id} note={note} showTeaName />
            ))}
          </div>
        ) : (
          <EmptyState type="notes" message="아직 기록된 노트가 없습니다." />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
