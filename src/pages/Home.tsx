import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { notesApi } from '../lib/api';
import { Note } from '../types';
import { logger } from '../lib/logger';
import { PenLine, Compass, BookOpen, X, MessageCircle, ChevronRight } from 'lucide-react';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { NoteCardSkeleton } from '../components/NoteCardSkeleton';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH } from '../constants';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const BANNER_KEY = 'home_banner_dismissed';

export function Home() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [myRecentNotes, setMyRecentNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_KEY) === 'true',
  );

  const today = useMemo(() => new Date(), []);

  const weekDates = useMemo(() => {
    const day = today.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - day + i);
      return d;
    });
  }, [today]);

  const fetchMyNotes = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!currentUser) return;
      try {
        if (!opts?.silent) setIsLoading(true);
        const data = await notesApi.getAll(
          currentUser.id,
          undefined,
          undefined,
          undefined,
          undefined,
          'latest',
          1,
          5,
        );
        setMyRecentNotes(Array.isArray(data) ? (data as Note[]) : []);
      } catch (error) {
        logger.error('Failed to fetch my notes:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser],
  );

  useEffect(() => {
    fetchMyNotes();
  }, [fetchMyNotes]);

  const handleRefresh = useCallback(async () => {
    await fetchMyNotes({ silent: true });
  }, [fetchMyNotes]);

  usePullToRefreshForPage(handleRefresh, '/');

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(BANNER_KEY, 'true');
  };

  return (
    <div className="min-h-screen pb-20">
      <Header showProfile showLogo />
      <div className="px-4 py-6 pb-20 sm:px-6 sm:py-8 space-y-6">

        {/* 배너 */}
        {!bannerDismissed && (
          <div className="relative flex items-center gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/15">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">차멍에 오신 것을 환영해요 🍵</p>
              <p className="text-xs text-muted-foreground mt-0.5">오늘도 좋은 차 한 잔 기록해보세요.</p>
            </div>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="shrink-0 p-1 rounded-full hover:bg-muted/60 transition-colors"
              aria-label="배너 닫기"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* 빠른 접근 버튼 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: PenLine, label: '차록 쓰기', to: '/note/new' },
            { icon: Compass, label: '탐색하기', to: '/sasaek' },
            { icon: BookOpen, label: '내 차록', to: '/my-notes' },
          ].map(({ icon: Icon, label, to }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* 오늘의 기록 카드 */}
        <div className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {today.getFullYear()}년 {today.getMonth() + 1}월
              </p>
              <p className="text-lg font-semibold text-foreground">
                {today.getDate()}일 {WEEKDAYS[today.getDay()]}요일
              </p>
            </div>
            {currentUser && (
              <button
                type="button"
                onClick={() => navigate('/note/new')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <PenLine className="w-3.5 h-3.5" />
                차록 쓰기
              </button>
            )}
          </div>

          {/* 주간 미니 캘린더 */}
          <div className="flex gap-1">
            {weekDates.map((d) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div
                  key={d.toDateString()}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl',
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/30',
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px]',
                      isToday ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {WEEKDAYS[d.getDay()]}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isToday ? 'text-primary-foreground' : 'text-foreground',
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 최근 내 차록 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">최근 차록</h2>
            {currentUser && (
              <Link
                to="/my-notes"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                전체보기
              </Link>
            )}
          </div>

          {!currentUser ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                로그인하면 내 차록을 확인할 수 있어요.
              </p>
              <Button size="sm" onClick={() => navigate('/login')}>
                로그인하기
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <NoteCardSkeleton key={i} />
              ))}
            </div>
          ) : myRecentNotes.length > 0 ? (
            <div className={CARD_CONTAINER_CLASSES}>
              {myRecentNotes.map((note) => (
                <div key={note.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                  <NoteCard note={note} showTeaName />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              type="feed"
              message="아직 차록이 없어요. 첫 차록을 남겨볼까요?"
              action={{ label: '차록 쓰기', onClick: () => navigate('/note/new') }}
            />
          )}
        </div>

        {/* 하단 푸터 */}
        <footer className="mt-12 pt-8 pb-6 border-t border-black/5">
          {import.meta.env.VITE_KAKAO_OPEN_CHAT_URL && (
            <a
              href={import.meta.env.VITE_KAKAO_OPEN_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 w-full max-w-sm mx-auto py-4 px-5 rounded-2xl bg-[#FEE500] hover:bg-[#FEE500]/95 text-[#191919] transition-all duration-200 mb-5 card-shadow hover:shadow-[0_4px_16px_rgba(254,229,0,0.35)] hover:-translate-y-0.5 active:translate-y-0 border border-[#FEE500]/80"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#191919]/8 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#191919]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#191919]">차에 대해 이야기해요</p>
                  <p className="text-xs text-[#191919]/70 mt-0.5">오픈채팅에서 만나요</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#191919]/60 group-hover:text-[#191919] group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
            <span>차멍 v0.1</span>
            <span className="text-border/60">·</span>
            <button
              type="button"
              onClick={() => toast.info('준비 중입니다.')}
              className="text-[11px] font-normal hover:text-foreground/70 transition-colors"
            >
              이용약관
            </button>
            <span className="text-border/60">·</span>
            <button
              type="button"
              onClick={() => toast.info('준비 중입니다.')}
              className="text-[11px] font-normal hover:text-foreground/70 transition-colors"
            >
              개인정보처리방침
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-3">
            © 2026 차멍. All rights reserved.
          </p>
        </footer>
      </div>
      <BottomNav />
    </div>
  );
}
