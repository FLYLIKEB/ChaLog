import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { PostCard } from '../components/PostCard';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/button';
import { notesApi, postsApi, teasApi } from '../lib/api';
import { Note, Post, Tea } from '../types';
import { logger } from '../lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../components/ui/utils';

type SavedTab = 'notes' | 'posts' | 'teas';
const PAGE_SIZE = 20;

export function Saved() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SavedTab>('notes');
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Note[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  // 노트: 클라이언트 표시 제한
  const [notesDisplayCount, setNotesDisplayCount] = useState(PAGE_SIZE);
  // 게시글: 서버 페이지네이션
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [wishlistedTeas, setWishlistedTeas] = useState<Tea[]>([]);
  const [isLoadingTeas, setIsLoadingTeas] = useState(false);

  const displayedNotes = useMemo(
    () => bookmarkedNotes.slice(0, notesDisplayCount),
    [bookmarkedNotes, notesDisplayCount],
  );
  const notesHasMore = notesDisplayCount < bookmarkedNotes.length;

  const fetchBookmarkedNotes = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingNotes(true);
      const notes = await notesApi.getAll(undefined, undefined, undefined, true);
      const notesArray = Array.isArray(notes) ? notes : [];
      setBookmarkedNotes(notesArray as Note[]);
      setNotesDisplayCount(PAGE_SIZE);
    } catch (error) {
      logger.error('Failed to fetch bookmarked notes:', error);
      toast.error('저장한 차록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingNotes(false);
    }
  }, [user]);

  const fetchBookmarkedPosts = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingPosts(true);
      setPostsPage(1);
      const posts = await postsApi.getAll(undefined, 1, PAGE_SIZE, undefined, true);
      setBookmarkedPosts(Array.isArray(posts) ? posts : []);
      setPostsHasMore(Array.isArray(posts) && posts.length === PAGE_SIZE);
    } catch (error) {
      logger.error('Failed to fetch bookmarked posts:', error);
      toast.error('저장한 게시글을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user]);

  const fetchWishlistedTeas = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingTeas(true);
      const teas = await teasApi.getWishlisted();
      setWishlistedTeas(Array.isArray(teas) ? teas : []);
    } catch (error) {
      logger.error('Failed to fetch wishlisted teas:', error);
      toast.error('찜한 차를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingTeas(false);
    }
  }, [user]);

  const handleLoadMorePosts = useCallback(async () => {
    if (!user) return;
    const nextPage = postsPage + 1;
    setIsLoadingMorePosts(true);
    try {
      const morePosts = await postsApi.getAll(undefined, nextPage, PAGE_SIZE, undefined, true);
      setBookmarkedPosts((prev) => [...prev, ...(Array.isArray(morePosts) ? morePosts : [])]);
      setPostsPage(nextPage);
      setPostsHasMore(Array.isArray(morePosts) && morePosts.length === PAGE_SIZE);
    } catch (error) {
      logger.error('Failed to load more bookmarked posts:', error);
      toast.error('게시글을 더 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [user, postsPage]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchBookmarkedNotes();
  }, [isAuthenticated, user, authLoading, navigate, fetchBookmarkedNotes]);

  useEffect(() => {
    if (activeTab === 'posts' && user) {
      fetchBookmarkedPosts();
    }
    if (activeTab === 'teas' && user) {
      fetchWishlistedTeas();
    }
  }, [activeTab, user, fetchBookmarkedPosts, fetchWishlistedTeas]);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'notes') {
      fetchBookmarkedNotes();
    } else if (activeTab === 'posts') {
      fetchBookmarkedPosts();
    } else {
      fetchWishlistedTeas();
    }
  }, [activeTab, fetchBookmarkedNotes, fetchBookmarkedPosts, fetchWishlistedTeas]);

  const handleNoteBookmarkRemoved = (noteId: number) => {
    setBookmarkedNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handlePostBookmarkRemoved = (postId: number) => {
    setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Header showBack showProfile title="저장함" />

      {/* 탭 */}
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-10 bg-background border-b border-border/50 px-4 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              activeTab === 'notes'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            차록
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              activeTab === 'posts'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            게시글
          </button>
          <button
            onClick={() => setActiveTab('teas')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              activeTab === 'teas'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            찜한 차
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {activeTab === 'notes' && (
          <Section title="저장한 차록" spacing="lg">
            {isLoadingNotes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
              </div>
            ) : bookmarkedNotes.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      showTeaName
                      onBookmarkToggle={(isBookmarked) => {
                        if (!isBookmarked) handleNoteBookmarkRemoved(note.id);
                      }}
                    />
                  ))}
                </div>
                {notesHasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesDisplayCount((prev) => prev + PAGE_SIZE)}
                      className="w-full max-w-xs"
                    >
                      더 보기
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                type="notes"
                message="아직 저장한 차록이 없어요."
                action={{ label: '탐색하기', onClick: () => navigate('/sasaek') }}
              />
            )}
          </Section>
        )}

        {activeTab === 'posts' && (
          <Section title="저장한 게시글" spacing="lg">
            {isLoadingPosts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
              </div>
            ) : bookmarkedPosts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                  {bookmarkedPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onBookmarkToggle={(isBookmarked) => {
                        if (!isBookmarked) handlePostBookmarkRemoved(post.id);
                      }}
                    />
                  ))}
                </div>
                {postsHasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMorePosts}
                      disabled={isLoadingMorePosts}
                      className="w-full max-w-xs"
                    >
                      {isLoadingMorePosts ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      더 보기
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                type="feed"
                message="아직 저장한 게시글이 없어요."
                action={{ label: '차담 보기', onClick: () => navigate('/chadam') }}
              />
            )}
          </Section>
        )}

        {activeTab === 'teas' && (
          <Section title="찜한 차" spacing="lg">
            {isLoadingTeas ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
              </div>
            ) : wishlistedTeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {wishlistedTeas.map(tea => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <EmptyState
                type="search"
                message="아직 찜한 차가 없어요."
                action={{ label: '차 탐색하기', onClick: () => navigate('/sasaek') }}
              />
            )}
          </Section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

