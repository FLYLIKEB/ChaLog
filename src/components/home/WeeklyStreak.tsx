import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, PenLine, Loader2, Plus } from 'lucide-react';
import { CtaButton } from '@/components/ui/CtaButton';
import { notesApi } from '@/lib/api';
import type { CalendarData } from '@/lib/api/notes.api';
import type { Note } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import { DAY_NAMES, formatDateKey, getWeekDays } from '@/utils/dateUtils';
import { NoteCard } from '@/components/NoteCard';

interface WeeklyStreakProps {
  onTodayNoteStatus?: (hasNote: boolean) => void;
  onStreakLoaded?: (streak: number) => void;
}

export function WeeklyStreak({ onTodayNoteStatus, onStreakLoaded }: WeeklyStreakProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => getWeekDays(today), [today]);

  const onTodayNoteStatusRef = useRef(onTodayNoteStatus);
  const onStreakLoadedRef = useRef(onStreakLoaded);
  useEffect(() => { onTodayNoteStatusRef.current = onTodayNoteStatus; }, [onTodayNoteStatus]);
  useEffect(() => { onStreakLoadedRef.current = onStreakLoaded; }, [onStreakLoaded]);

  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedDateNotes, setSelectedDateNotes] = useState<Note[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isNotesLoading, setIsNotesLoading] = useState(false);

  const fetchNotesByDate = useCallback(async (date: Date) => {
    if (!user) return;
    setIsNotesLoading(true);
    try {
      const notes = await notesApi.getByDate(user.id, formatDateKey(date));
      setSelectedDateNotes(notes);
    } catch {
      toast.error('차록을 불러오지 못했습니다.');
    } finally {
      setIsNotesLoading(false);
    }
  }, [user]);

  const fetchCalendar = useCallback(async () => {
    if (!user) return;
    setIsCalendarLoading(true);
    try {
      const data = await notesApi.getCalendar(user.id, today.getFullYear(), today.getMonth() + 1);
      setCalendarData(data);
      onStreakLoadedRef.current?.(data.streak.current);
      const todayKey = formatDateKey(today);
      onTodayNoteStatusRef.current?.(data.dates.includes(todayKey));
      await fetchNotesByDate(today);
    } catch {
      toast.error('캘린더 데이터를 불러오지 못했습니다.');
    } finally {
      setIsCalendarLoading(false);
    }
  }, [user, today, fetchNotesByDate]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleDayClick = useCallback(async (day: Date) => {
    setSelectedDate(day);
    await fetchNotesByDate(day);
  }, [fetchNotesByDate]);

  if (!user) return null;

  const noteDates = new Set(calendarData?.dates ?? []);
  const streak = calendarData?.streak.current ?? 0;
  const selectedDateKey = formatDateKey(selectedDate);

  return (
    <div className="rounded-2xl bg-card border border-border/30 p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">이번 주 차록</span>
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-[11px] font-semibold text-orange-500">{streak}일 연속</span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/calendar')}
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          전체보기
        </button>
      </div>

      {/* Weekly days */}
      {isCalendarLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex justify-between">
          {weekDays.map((day) => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === formatDateKey(today);
            const isSelected = dateKey === selectedDateKey;
            const hasNote = noteDates.has(dateKey);
            return (
              <button
                key={dateKey}
                type="button"
                data-testid={`day-btn-${dateKey}`}
                onClick={() => handleDayClick(day)}
                className="flex flex-col items-center gap-1 w-10 py-1.5"
              >
                <span className={cn(
                  'text-[10px] font-medium',
                  isToday ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {DAY_NAMES[day.getDay()]}
                </span>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : isSelected
                      ? 'bg-primary/20 text-primary'
                      : hasNote
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground',
                )}>
                  {day.getDate()}
                </span>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  hasNote ? 'bg-primary' : 'bg-transparent',
                )} />
              </button>
            );
          })}
        </div>
      )}

      {/* Notes for selected date */}
      <div className="mt-4">
        {isNotesLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : selectedDateNotes.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {selectedDateNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-muted-foreground">이 날의 차록이 없습니다.</p>
            <button
              onClick={() => navigate('/note/new')}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              기록 추가하기
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      <CtaButton onClick={() => navigate('/note/new')} icon={PenLine} label="오늘 차록 쓰기" />
    </div>
  );
}
