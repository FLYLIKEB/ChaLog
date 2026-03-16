import { useNavigate } from 'react-router-dom';
import { BarChart2, Bookmark, Grid3X3, List, Lock, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Note } from '@/types';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { cn } from '@/components/ui/utils';
import { TEA_TYPES } from '@/constants';
import { fetchWeather } from '@/utils/weather';

// Weather emoji cache (persists across re-renders)
const weatherCache = new Map<string, string>();

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function useWeatherEmojis(notes: Note[]) {
  const [emojis, setEmojis] = useState<Map<string, string>>(new Map(weatherCache));
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const dates: string[] = [];
    notes.forEach((n) => {
      const d = n.drinkDate ? String(n.drinkDate).slice(0, 10) : n.createdAt ? new Date(n.createdAt).toISOString().slice(0, 10) : null;
      if (d && !weatherCache.has(d) && !fetchedRef.current.has(d) && !dates.includes(d)) dates.push(d);
    });
    if (dates.length === 0) return;

    dates.forEach((d) => fetchedRef.current.add(d));

    let cancelled = false;
    (async () => {
      for (const d of dates.slice(0, 5)) {
        if (cancelled) break;
        const w = await fetchWeather(d).catch(() => null);
        if (w) {
          weatherCache.set(d, w.emoji);
          setEmojis(new Map(weatherCache));
        }
        await delay(300);
      }
    })();

    return () => { cancelled = true; };
  }, [notes]);

  return emojis;
}

function getNoteDateKey(note: Note): string | null {
  if (note.drinkDate) return String(note.drinkDate).slice(0, 10);
  if (note.createdAt) return new Date(note.createdAt).toISOString().slice(0, 10);
  return null;
}


const TEA_TYPE_ACCENT: Record<(typeof TEA_TYPES)[number], string> = {
  '녹차': 'bg-emerald-400',
  '백차': 'bg-stone-300',
  '황차': 'bg-amber-400',
  '청차/우롱차': 'bg-blue-400',
  '홍차': 'bg-rose-400',
  '흑차/보이차': 'bg-neutral-600',
  '대용차': 'bg-slate-400',
};
import { ReportContent } from './ReportContent';
import { SavedContent } from './SavedContent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortType = 'latest' | 'rating';
type TabType = 'grid' | 'list' | 'report' | 'saved';

interface UserNoteListProps {
  notes: Note[];
  noteTotal: number;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isOwnProfile: boolean;
}

function NoteGridItem({ note, weatherEmoji }: { note: Note; weatherEmoji?: string }) {
  const navigate = useNavigate();
  const hasImage = note.images && note.images.length > 0;
  const thumbnail = hasImage
    ? (note.imageThumbnails?.[0] ?? note.images![0])
    : null;

  const accentClass = note.teaType && note.teaType in TEA_TYPE_ACCENT
    ? TEA_TYPE_ACCENT[note.teaType as keyof typeof TEA_TYPE_ACCENT]
    : 'bg-muted';

  return (
    <button
      type="button"
      onClick={() => navigate(`/note/${note.id}`)}
      className="relative aspect-[3/4] w-full overflow-hidden flex flex-col rounded-2xl bg-card"
    >
      {/* Content */}
      <div className="flex-1 flex flex-col justify-between p-3">
        {/* Top: date + weather + lock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              {note.createdAt
                ? new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                : ''}
            </span>
            {weatherEmoji && <span className="text-[10px]">{weatherEmoji}</span>}
          </div>
          {!note.isPublic && <Lock className="w-3 h-3 text-muted-foreground" />}
        </div>

        {/* Center: thumbnail + title + stars */}
        <div className="flex flex-col items-center gap-1.5">
          {thumbnail ? (
            <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0">
              <ImageWithFallback
                src={thumbnail}
                alt={note.teaName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="차멍" className="w-7 h-7 object-contain opacity-30" />
            </div>
          )}
          <div className="flex items-center justify-center gap-1 w-full">
            {note.teaType && (
              <span className={cn('w-2 h-2 rounded-full shrink-0', accentClass)} />
            )}
            <span className="text-sm font-bold text-foreground text-center line-clamp-2 leading-tight">
              {note.teaName}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">
            {[note.teaYear ? `${note.teaYear}년` : '*', note.teaSeller || '*'].join(' · ')}
          </span>
          {note.overallRating !== null && Number(note.overallRating) > 0 && (
            <div className="flex items-center gap-px">
              {[1, 2, 3, 4, 5].map((i) => {
                const rating = Number(note.overallRating);
                const filled = i <= Math.floor(rating);
                const half = !filled && i === Math.ceil(rating) && rating % 1 >= 0.3;
                return (
                  <Star
                    key={i}
                    className={cn(
                      'w-2.5 h-2.5',
                      filled
                        ? 'fill-rating text-rating'
                        : half
                          ? 'fill-rating/50 text-rating'
                          : 'fill-none text-muted-foreground/25',
                    )}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom spacer */}
        <div />
      </div>
    </button>
  );
}

export function UserNoteList({
  notes,
  noteTotal,
  sort,
  onSortChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isOwnProfile,
}: UserNoteListProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('grid');
  const weatherEmojis = useWeatherEmojis(notes);

  const isNoteTab = activeTab === 'grid' || activeTab === 'list';

  return (
    <div>
      {/* Tab bar - Instagram style */}
      <div className="flex border-b border-border/40">
        <button
          type="button"
          onClick={() => setActiveTab('grid')}
          className={cn(
            'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
            activeTab === 'grid'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground'
          )}
          aria-label="그리드 보기"
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={cn(
            'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
            activeTab === 'list'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground'
          )}
          aria-label="리스트 보기"
        >
          <List className="w-5 h-5" />
        </button>
        {isOwnProfile && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={cn(
                'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
                activeTab === 'report'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground'
              )}
              aria-label="레포트"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={cn(
                'flex-1 flex items-center justify-center py-3 transition-colors border-b-2',
                activeTab === 'saved'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground'
              )}
              aria-label="저장함"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Note tabs: grid / list */}
      {isNoteTab && (
        <>
          {/* Sort control */}
          {notes.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-muted-foreground">{noteTotal}개의 차록</span>
              <Select value={sort} onValueChange={(v) => onSortChange(v as SortType)}>
                <SelectTrigger className="w-24 h-7 text-xs border-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="rating">별점순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {notes.length > 0 ? (
            <>
              {activeTab === 'grid' ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3 px-2 md:px-4">
                  {notes.map((note) => (
                    <NoteGridItem key={note.id} note={note} weatherEmoji={weatherEmojis.get(getNoteDateKey(note) ?? '') ?? undefined} />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 md:px-6 space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
                  {notes.map((note) => (
                    <NoteCard key={note.id} note={note} showTeaName />
                  ))}
                </div>
              )}
              <InfiniteScrollSentinel
                onLoadMore={onLoadMore}
                loading={isLoadingMore}
                hasMore={hasMore}
              />
            </>
          ) : (
            <div className="px-4 py-8">
              <EmptyState
                type="notes"
                message="아직 작성한 차록이 없어요."
                action={{ label: '첫 차록 쓰기', onClick: () => navigate('/note/new') }}
              />
            </div>
          )}
        </>
      )}

      {/* Report tab */}
      {activeTab === 'report' && <ReportContent />}

      {/* Saved tab */}
      {activeTab === 'saved' && <SavedContent />}
    </div>
  );
}
