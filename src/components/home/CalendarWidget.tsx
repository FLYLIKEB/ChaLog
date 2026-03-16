import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { StreakCards } from '@/components/calendar/StreakCards';
import { DateNotesDrawer } from '@/components/calendar/DateNotesDrawer';
import { notesApi } from '@/lib/api';
import type { CalendarData } from '@/lib/api/notes.api';
import type { Note } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import { DAY_NAMES, formatDateKey, getMonthWeeks } from '@/utils/dateUtils';

export function CalendarWidget() {
  const { user } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateNotes, setDateNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const fetchCalendar = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await notesApi.getCalendar(user.id, year, month);
      setCalendarData(data);
    } catch {
      toast.error('캘린더 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleDayClick = useCallback(async (date: Date) => {
    if (!user) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedDate(date);
    setDrawerOpen(true);
    setIsLoadingNotes(true);
    setDateNotes([]);
    try {
      const notes = await notesApi.getByDate(user.id, formatDateKey(date));
      setDateNotes(notes);
    } catch {
      toast.error('차록을 불러오지 못했습니다.');
    } finally {
      setIsLoadingNotes(false);
    }
  }, [user]);

  const goToPrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else { setMonth((m) => m - 1); }
  };

  const goToNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else { setMonth((m) => m + 1); }
  };

  if (!user) return null;

  const noteDates = new Set(calendarData?.dates ?? []);
  const todayKey = formatDateKey(now);
  const weeks = getMonthWeeks(year, month);

  return (
    <section aria-label="차록 캘린더" className="space-y-4">
      <StreakCards
        current={calendarData?.streak.current ?? 0}
        longest={calendarData?.streak.longest ?? 0}
      />

      {/* Month calendar card */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 md:p-5 space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="font-semibold text-sm text-foreground">
            {year}년 {month}월
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Day headers */}
            <div className="grid grid-cols-7">
              {DAY_NAMES.map((name, i) => (
                <span
                  key={name}
                  className={cn(
                    'text-center text-[10px] font-medium pb-2',
                    i === 0 ? 'text-rose-400' : 'text-muted-foreground',
                  )}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* Week rows */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={`empty-${di}`} className="aspect-square" />;
                  }
                  const dateKey = formatDateKey(day);
                  const isToday = dateKey === todayKey;
                  const hasNote = noteDates.has(dateKey);
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className="flex flex-col items-center justify-center aspect-square gap-0.5"
                    >
                      <span
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                          isToday
                            ? 'bg-primary text-primary-foreground'
                            : hasNote
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-muted/50',
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          hasNote ? 'bg-primary' : 'bg-transparent',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Note count */}
        {!isLoading && calendarData && (
          <p className="text-center text-xs text-muted-foreground pt-1">
            이번 달 차록 <span className="font-semibold text-foreground">{calendarData.dates.length}개</span>
          </p>
        )}
      </div>

      <DateNotesDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedDate={selectedDate}
        notes={dateNotes}
        isLoading={isLoadingNotes}
      />
    </section>
  );
}
