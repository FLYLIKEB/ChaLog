import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { BottomNav } from '../components/BottomNav';
import { usersApi, notesApi } from '../lib/api';
import { User, Note } from '../types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '../lib/logger';
import { getAvatarGradient, getAvatarTextColor } from '../utils/avatar';

type SortType = 'latest' | 'rating';

export function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = id ? parseInt(id, 10) : NaN;
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortType>('latest');

  useEffect(() => {
    const fetchData = async () => {
      if (isNaN(userId)) {
        toast.error('유효하지 않은 사용자 ID입니다.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [userData, notesData] = await Promise.all([
          usersApi.getById(userId),
          notesApi.getAll(userId, true), // 공개 노트만 조회
        ]);
        
        setUser(userData as User);
        const notesArray = Array.isArray(notesData) ? notesData : [];
        setNotes(notesArray as Note[]);
      } catch (error: any) {
        logger.error('Failed to fetch user profile:', error);
        
        if (error?.statusCode === 404) {
          toast.error('사용자를 찾을 수 없습니다.');
        } else {
          toast.error('사용자를 불러오는데 실패했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // 정렬 조건 적용
  const sortedNotes = [...notes].sort((a, b) => {
    if (sort === 'latest') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else {
      return b.rating - a.rating;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header showBack title="사용자 프로필" />
        <div className="p-4">
          <EmptyState type="notes" message="사용자를 찾을 수 없습니다." />
        </div>
        <BottomNav />
      </div>
    );
  }

  // 사용자 이름의 첫 글자 추출
  const userInitial = user.name.charAt(0).toUpperCase();
  const gradient = getAvatarGradient(user.name);
  const textColor = getAvatarTextColor(user.name);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header showBack title="사용자 프로필" />
      
      <div className="p-4 space-y-4">
        {/* 프로필 정보 섹션 */}
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient.from} ${gradient.to} flex items-center justify-center ${textColor} text-2xl font-bold shadow-lg ring-2 ring-white/30`}
            >
              {userInitial}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-gray-500">작성한 노트 {notes.length}개</p>
            </div>
          </div>
        </section>

        {/* 정렬 드롭다운 */}
        {notes.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              총 {sortedNotes.length}개
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
        )}

        {/* 노트 목록 */}
        {sortedNotes.length > 0 ? (
          <div className="space-y-3">
            {sortedNotes.map(note => (
              <NoteCard key={note.id} note={note} showTeaName />
            ))}
          </div>
        ) : (
          <EmptyState type="notes" message="아직 작성한 노트가 없습니다." />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

