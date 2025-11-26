import React, { useState, useEffect } from 'react';
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
import { BottomNav } from '../components/BottomNav';
import { notesApi } from '../lib/api';
import { Note } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '../lib/logger';

type FilterType = 'all' | 'public' | 'private';
type SortType = 'latest' | 'rating';

export function MyNotes() {
  const { user, isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('latest');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await notesApi.getAll(user.id);
        const notesArray = Array.isArray(data) ? data : [];
        // API 레이어에서 이미 정규화 및 날짜 변환이 완료됨
        setNotes(notesArray as Note[]);
      } catch (error) {
        logger.error('Failed to fetch notes:', error);
        toast.error('노트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [isAuthenticated, user]);

  // 필터 조건 적용
  let filteredNotes = [...notes];
  if (filter === 'public') {
    filteredNotes = filteredNotes.filter(note => note.isPublic);
  } else if (filter === 'private') {
    filteredNotes = filteredNotes.filter(note => !note.isPublic);
  }

  // 정렬 조건 적용
  filteredNotes = filteredNotes.sort((a, b) => {
    if (sort === 'latest') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else {
      return b.rating - a.rating;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header title="내 노트" />
        <div className="p-4">
          <EmptyState type="notes" message="로그인이 필요합니다." />
        </div>
        <BottomNav />
      </div>
    );
  }

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
            총 {filteredNotes.length}개
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
        {filteredNotes.length > 0 ? (
          <div className="space-y-3">
            {filteredNotes.map(note => (
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
