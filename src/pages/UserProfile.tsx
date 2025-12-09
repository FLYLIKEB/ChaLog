import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
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
import { Loader2, Star, Heart, FileText } from 'lucide-react';
import { logger } from '../lib/logger';
import { UserAvatar } from '../components/ui/UserAvatar';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/card';
import { Section } from '../components/ui/Section';

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
      } catch (error: unknown) {
        logger.error('Failed to fetch user profile:', error);
        
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404) {
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

  // 통계 계산
  const stats = useMemo(() => {
    if (notes.length === 0) {
      return {
        averageRating: 0,
        totalLikes: 0,
        noteCount: 0,
      };
    }
    
    const averageRating = notes.reduce((sum, note) => sum + (note.rating || 0), 0) / notes.length;
    const totalLikes = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0);
    
    return {
      averageRating: Number(averageRating.toFixed(1)),
      totalLikes,
      noteCount: notes.length,
    };
  }, [notes]);

  // 정렬 조건 적용
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (sort === 'latest') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        return b.rating - a.rating;
      }
    });
  }, [notes, sort]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header showBack title="사용자 프로필" />
        <div className="p-4">
          <EmptyState type="notes" message="사용자를 찾을 수 없습니다." />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showBack title="사용자 프로필" />
      
      <div className="p-6 space-y-6">
        {/* 프로필 헤더 섹션 */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar name={user.name} size="xl" />
            <div>
              <h2 className="text-2xl font-semibold text-primary">{user.name}</h2>
              <p className="text-sm text-muted-foreground">작성한 노트 {notes.length}개</p>
            </div>
          </div>
        </Card>

        {/* 통계 카드 섹션 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            icon={Star}
            value={stats.averageRating}
            label="평균 평점"
          />
          <StatCard
            icon={Heart}
            value={stats.totalLikes.toLocaleString('ko-KR')}
            label="총 좋아요"
          />
          <StatCard
            icon={FileText}
            value={stats.noteCount}
            label="작성한 노트"
          />
        </div>

        {/* 정렬 드롭다운 */}
        {notes.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
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

        {/* 노트 목록 섹션 */}
        <Section spacing="lg">
          {sortedNotes.length > 0 ? (
            <div className="space-y-3">
              {sortedNotes.map(note => (
                <NoteCard key={note.id} note={note} showTeaName />
              ))}
            </div>
          ) : (
            <EmptyState type="notes" message="아직 작성한 노트가 없습니다." />
          )}
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}

