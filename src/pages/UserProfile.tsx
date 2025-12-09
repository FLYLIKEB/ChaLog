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
import { Loader2, Star, Heart, FileText, Camera } from 'lucide-react';
import { logger } from '../lib/logger';
import { UserAvatar } from '../components/ui/UserAvatar';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/card';
import { Section } from '../components/ui/Section';
import { ProfileImageEditModal } from '../components/ProfileImageEditModal';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

type SortType = 'latest' | 'rating';

export function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const userId = id ? parseInt(id, 10) : NaN;
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortType>('latest');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 내 프로필인지 확인 (인증 로딩이 완료된 후에만 확인)
  const isOwnProfile = !authLoading && currentUser && userId === currentUser.id;

  useEffect(() => {
    // 인증 로딩이 완료될 때까지 기다림
    if (authLoading) {
      return;
    }

    const fetchData = async () => {
      if (isNaN(userId)) {
        toast.error('유효하지 않은 사용자 ID입니다.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // 내 프로필이면 모든 노트, 다른 사용자면 공개 노트만
        const isPublicFilter = isOwnProfile ? undefined : true;
        const [userData, notesData] = await Promise.all([
          usersApi.getById(userId),
          notesApi.getAll(userId, isPublicFilter),
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
  }, [userId, isOwnProfile, authLoading]);

  // 통계 계산
  const stats = useMemo(() => {
    if (notes.length === 0) {
      return {
        averageRating: 0,
        totalLikes: 0,
        noteCount: 0,
      };
    }
    
    const averageRating = notes.reduce((sum, note) => sum + (note.overallRating || 0), 0) / notes.length;
    const totalLikes = notes.reduce((sum, note) => sum + (note.likeCount || 0), 0);
    
    // NaN 체크 및 기본값 설정
    const safeAverageRating = isNaN(averageRating) ? 0 : Number(averageRating.toFixed(1));
    
    return {
      averageRating: safeAverageRating,
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
        return (b.overallRating || 0) - (a.overallRating || 0);
      }
    });
  }, [notes, sort]);

  const handleProfileImageUpdate = (imageUrl: string) => {
    if (user) {
      setUser({ ...user, profileImageUrl: imageUrl || null });
    }
  };

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
            <div className="relative">
              <UserAvatar 
                name={user.name} 
                profileImageUrl={user.profileImageUrl}
                size="xl" 
              />
              {isOwnProfile && (
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8 bg-primary hover:bg-primary/90"
                  aria-label="프로필 사진 수정"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-primary">{user.name}</h2>
              <p className="text-sm text-muted-foreground">작성한 노트 {notes.length}개</p>
            </div>
          </div>
        </Card>

        {/* 프로필 사진 수정 모달 */}
        {isOwnProfile && user && (
          <ProfileImageEditModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            currentImageUrl={user.profileImageUrl}
            onSuccess={handleProfileImageUpdate}
            userId={user.id}
          />
        )}

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

