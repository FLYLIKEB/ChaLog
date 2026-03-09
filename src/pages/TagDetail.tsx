import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Hash, Bell, BellOff, Loader2, Star, Heart, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { TeaCard } from '../components/TeaCard';
import { tagsApi, teasApi } from '../lib/api';
import { TagDetail as TagDetailType, TagNoteList, PopularTagItem, Tea } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { TEA_TYPE_PLACEHOLDER_BG } from '../constants';
import { cn } from '../components/ui/utils';

const LIMIT = 20;

export function TagDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tagDetail, setTagDetail] = useState<TagDetailType | null>(null);
  const [noteList, setNoteList] = useState<TagNoteList | null>(null);
  const [popularTags, setPopularTags] = useState<PopularTagItem[]>([]);
  const [recentTags, setRecentTags] = useState<PopularTagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'teas' | 'related'>('notes');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [teas, setTeas] = useState<Tea[]>([]);
  const [teasLoading, setTeasLoading] = useState(false);
  const [teasSort, setTeasSort] = useState<'match' | 'popular' | 'recent'>('match');

  const decodedName = name ? decodeURIComponent(name) : '';

  const loadInitialData = useCallback(async () => {
    if (!decodedName) return;
    setIsLoading(true);
    try {
      const [detail, notes, popular, recent] = await Promise.all([
        tagsApi.getTagDetail(decodedName),
        tagsApi.getTagNotes(decodedName, 1, LIMIT),
        tagsApi.getPopularTags(10),
        tagsApi.getRecentTags(10),
      ]);
      setTagDetail(detail);
      setNoteList(notes);
      setHasMore(notes.notes.length === LIMIT && notes.total > LIMIT);
      setPopularTags(popular);
      setRecentTags(recent);
      setPage(1);
    } catch (error: any) {
      logger.error('Failed to load tag detail:', error);
      if (error?.statusCode === 404) {
        toast.error('존재하지 않는 향미입니다.');
        navigate(-1);
      } else {
        toast.error('향미 정보를 불러올 수 없습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [decodedName, navigate]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const fetchTeasByTag = useCallback(async () => {
    if (!decodedName) return;
    setTeasLoading(true);
    try {
      const data = await teasApi.getByTags([decodedName], teasSort, 50);
      setTeas(Array.isArray(data) ? data : []);
    } catch (error: any) {
      logger.error('Failed to fetch teas by tag:', error);
      toast.error('차 목록을 불러오는데 실패했습니다.');
      setTeas([]);
    } finally {
      setTeasLoading(false);
    }
  }, [decodedName, teasSort]);

  useEffect(() => {
    if (activeTab === 'teas') {
      fetchTeasByTag();
    }
  }, [activeTab, fetchTeasByTag]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !decodedName) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await tagsApi.getTagNotes(decodedName, nextPage, LIMIT);
      setNoteList((prev) =>
        prev
          ? { ...result, notes: [...prev.notes, ...result.notes] }
          : result,
      );
      setPage(nextPage);
      setHasMore(result.notes.length === LIMIT && (noteList?.notes.length ?? 0) + result.notes.length < result.total);
    } catch (error: any) {
      logger.error('Failed to load more notes:', error);
      toast.error('차록을 더 불러올 수 없습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!tagDetail || isFollowLoading) return;

    setIsFollowLoading(true);
    const wasFollowing = tagDetail.isFollowing;
    try {
      if (wasFollowing) {
        await tagsApi.unfollowTag(decodedName);
        setTagDetail((prev) =>
          prev
            ? { ...prev, isFollowing: false, followerCount: Math.max(0, prev.followerCount - 1) }
            : prev,
        );
        toast.success(`#${decodedName} 구독을 취소했습니다.`);
      } else {
        await tagsApi.followTag(decodedName);
        setTagDetail((prev) =>
          prev ? { ...prev, isFollowing: true, followerCount: prev.followerCount + 1 } : prev,
        );
        toast.success(`#${decodedName} 향미를 구독했습니다.`);
      }
    } catch (error: any) {
      logger.error('Failed to toggle follow:', error);
      toast.error(wasFollowing ? '구독 취소에 실패했습니다.' : '구독에 실패했습니다.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title={`#${decodedName}`} showProfile />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!tagDetail) return null;

  const notes = noteList?.notes ?? [];
  const total = noteList?.total ?? 0;

  return (
    <div className="min-h-screen">
      <Header title="" showProfile />

      {/* 태그 헤더 */}
      <div className="px-4 pt-2 pb-4 border-b border-border/50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-3 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-xl font-bold truncate">{decodedName}</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5" />
                차록 {total.toLocaleString()}개
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                구독자 {tagDetail.followerCount.toLocaleString()}명
              </span>
            </div>
          </div>

          <Button
            variant={tagDetail.isFollowing ? 'outline' : 'default'}
            size="sm"
            onClick={handleFollowToggle}
            disabled={isFollowLoading}
            className="shrink-0"
          >
            {isFollowLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tagDetail.isFollowing ? (
              <>
                <BellOff className="w-4 h-4 mr-1.5" />
                구독 중
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-1.5" />
                구독
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-border/50">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'notes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('notes')}
        >
          차록 목록
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'teas'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('teas')}
        >
          차 목록
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'related'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('related')}
        >
          관련 향미
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="pb-24">
        {activeTab === 'notes' && (
          <>
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Hash className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">이 향미가 달린 공개 차록이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/note/${note.id}`)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    {/* 차 이미지 */}
                    <div
                      className={cn(
                        'shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center',
                        note.teaImageUrl
                          ? ''
                          : note.teaType && note.teaType in TEA_TYPE_PLACEHOLDER_BG
                            ? TEA_TYPE_PLACEHOLDER_BG[note.teaType as keyof typeof TEA_TYPE_PLACEHOLDER_BG]
                            : 'bg-muted'
                      )}
                    >
                      {note.teaImageUrl ? (
                        <img src={note.teaImageUrl} alt={note.teaName} className="w-full h-full object-cover" />
                      ) : (
                        <Star className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-primary truncate">{note.teaName}</p>
                      {note.memo && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{note.memo}</p>
                      )}
                      {note.overallRating !== null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-rating text-rating" />
                          <span className="text-xs font-medium">{Number(note.overallRating).toFixed(1)}</span>
                        </div>
                      )}
                      {/* 태그 */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {note.tags.slice(0, 4).map((tag) => (
                            <Link
                              key={tag}
                              to={`/tag/${encodeURIComponent(tag)}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                                tag === decodedName
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground hover:bg-muted/80'
                              }`}
                            >
                              {tag}
                            </Link>
                          ))}
                          {note.tags.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{note.tags.length - 4}</span>
                          )}
                        </div>
                      )}
                      {/* 작성자 & 좋아요 */}
                      <div className="flex items-center justify-between mt-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${note.userId}`);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {note.userName}
                          <span className="mx-1">·</span>
                          {new Date(note.createdAt).toLocaleDateString('ko-KR')}
                        </button>
                        {note.likeCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Heart className="w-3 h-3" />
                            {note.likeCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 더 보기 버튼 */}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      더 보기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'teas' && (
          <div className="px-4 py-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">정렬:</span>
              {[
                { key: 'match' as const, label: '일치율순' },
                { key: 'popular' as const, label: '인기도순' },
                { key: 'recent' as const, label: '최신순' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTeasSort(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    teasSort === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border/60 hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {teasLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : teas.length > 0 ? (
              <div className="space-y-3">
                {teas.map((tea) => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Star className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">이 향미가 달린 차가 없습니다.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/sasaek?tags=${encodeURIComponent(decodedName)}&sort=match`)}
                >
                  더 살펴보기
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'related' && (
          <div className="px-4 py-4 space-y-6">
            {/* 인기 태그 */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                인기 향미
              </h2>
              {popularTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">인기 향미가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <Link
                      key={tag.name}
                      to={`/tag/${encodeURIComponent(tag.name)}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        tag.name === decodedName
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Hash className="w-3 h-3" />
                      {tag.name}
                      <span className="text-xs opacity-70">({tag.noteCount})</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* 신규 태그 */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                신규 향미
              </h2>
              {recentTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">신규 향미가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recentTags.map((tag) => (
                    <Link
                      key={tag.name}
                      to={`/tag/${encodeURIComponent(tag.name)}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        tag.name === decodedName
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      <Hash className="w-3 h-3" />
                      {tag.name}
                      {tag.noteCount > 0 && (
                        <span className="text-xs opacity-70">({tag.noteCount})</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
