import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { TeaCard } from '../components/TeaCard';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { teasApi, notesApi } from '../lib/api';
import { Tea, Note } from '../types';
import { logger } from '../lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

type FeedTab = 'forYou' | 'following';

export function Home() {
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [todayTea, setTodayTea] = useState<Tea | null>(null);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [followingNotes, setFollowingNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');

  const fetchForYouFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [teasResult, notesResult] = await Promise.allSettled([
        teasApi.getAll(),
        notesApi.getAll(undefined, true),
      ]);

      if (teasResult.status === 'fulfilled') {
        const teasArray = Array.isArray(teasResult.value) ? teasResult.value : [];
        if (teasArray.length > 0) {
          const randomIndex = Math.floor(Math.random() * teasArray.length);
          setTodayTea(teasArray[randomIndex]);
        }
      } else {
        const error = teasResult.reason;
        logger.error('Failed to fetch teas:', error);
        if (error?.statusCode === 429) {
          toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          toast.error('차 정보를 불러오는데 실패했습니다.');
        }
      }

      if (notesResult.status === 'fulfilled') {
        const notesArray = Array.isArray(notesResult.value) ? notesResult.value : [];
        setPublicNotes(notesArray as Note[]);
      } else {
        const error = notesResult.reason;
        logger.error('Failed to fetch notes:', error);
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
  }, []);

  const fetchFollowingFeed = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsFollowingLoading(true);
      const notesData = await notesApi.getAll(undefined, undefined, undefined, undefined, 'following');
      const notesArray = Array.isArray(notesData) ? notesData : [];
      setFollowingNotes(notesArray as Note[]);
    } catch (error) {
      logger.error('Failed to fetch following notes:', error);
      toast.error('팔로잉 피드를 불러오는데 실패했습니다.');
    } finally {
      setIsFollowingLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchForYouFeed();
  }, [fetchForYouFeed]);

  useEffect(() => {
    if (activeTab === 'following' && currentUser && !authLoading) {
      fetchFollowingFeed();
    }
  }, [activeTab, currentUser, authLoading, fetchFollowingFeed]);

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
      
      <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* 오늘의 차 섹션 */}
        <Section title="오늘의 차" spacing="lg">
          {todayTea ? (
            <TeaCard tea={todayTea} />
          ) : (
            <EmptyState type="feed" message="등록된 차가 없습니다." />
          )}
        </Section>

        {/* 피드 탭 섹션 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FeedTab)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="forYou" className="flex-1">For You</TabsTrigger>
            <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="forYou" className="mt-4">
            {publicNotes.length > 0 ? (
              <div className="space-y-0">
                {publicNotes.map(note => (
                  <NoteCard key={note.id} note={note} showTeaName />
                ))}
              </div>
            ) : (
              <EmptyState type="feed" message="아직 등록된 노트가 없습니다." />
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            {!currentUser && !authLoading ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  팔로잉한 리뷰어의 노트를 보려면 로그인이 필요합니다.
                </p>
                <Button size="sm" onClick={() => navigate('/login')}>
                  로그인하기
                </Button>
              </div>
            ) : isFollowingLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : followingNotes.length > 0 ? (
              <div className="space-y-0">
                {followingNotes.map(note => (
                  <NoteCard key={note.id} note={note} showTeaName />
                ))}
              </div>
            ) : (
              <EmptyState
                type="feed"
                message="팔로잉한 리뷰어의 노트가 없습니다. 리뷰어를 팔로우해 보세요!"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
