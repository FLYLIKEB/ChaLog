import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteCard } from '@/components/NoteCard';
import { PostCard } from '@/components/PostCard';
import { TeaCard } from '@/components/TeaCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { notesApi, postsApi, teasApi } from '@/lib/api';
import { Note, Post, Tea } from '@/types';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/components/ui/utils';

type SavedTab = 'notes' | 'posts' | 'teas';
const PAGE_SIZE = 20;

export function SavedContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SavedTab>('notes');
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Note[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [notesDisplayCount, setNotesDisplayCount] = useState(PAGE_SIZE);
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
    if (user) fetchBookmarkedNotes();
  }, [user, fetchBookmarkedNotes]);

  useEffect(() => {
    if (activeTab === 'posts' && user) fetchBookmarkedPosts();
    if (activeTab === 'teas' && user) fetchWishlistedTeas();
  }, [activeTab, user, fetchBookmarkedPosts, fetchWishlistedTeas]);

  const handleNoteBookmarkRemoved = (noteId: number) => {
    setBookmarkedNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handlePostBookmarkRemoved = (postId: number) => {
    setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div>
      {/* Sub tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border/30">
        {([
          { key: 'notes', label: '차록' },
          { key: 'posts', label: '게시글' },
          { key: 'teas', label: '찜한 차' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeTab === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'notes' && (
          <>
            {isLoadingNotes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : bookmarkedNotes.length > 0 ? (
              <>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3">
                  {displayedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onBookmarkToggle={(isBookmarked) => {
                        if (!isBookmarked) handleNoteBookmarkRemoved(note.id);
                      }}
                    />
                  ))}
                </div>
                {notesHasMore && (
                  <div className="flex justify-center pt-2">
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
          </>
        )}

        {activeTab === 'posts' && (
          <>
            {isLoadingPosts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : bookmarkedPosts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <div className="flex justify-center pt-2">
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
          </>
        )}

        {activeTab === 'teas' && (
          <>
            {isLoadingTeas ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
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
          </>
        )}
      </div>
    </div>
  );
}
