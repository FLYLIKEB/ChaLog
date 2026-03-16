import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Flame, Trophy, ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Calendar } from '../components/ui/calendar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../components/ui/drawer';
import { NoteCard } from '../components/NoteCard';
import { notesApi } from '../lib/api';
import type { CalendarData } from '../lib/api/notes.api';
import type { Note } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAY_NAMES[date.getDay()];
  return `${m}월 ${d}일(${day})`;
}

export function TeaCalendar() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateNotes, setDateNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

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
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const noteDates = new Set(calendarData?.dates ?? []);

  const modifiers = {
    hasNote: (date: Date) => noteDates.has(formatDateKey(date)),
  };

  const modifiersClassNames = {
    hasNote: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary',
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <Header title="차록 캘린더" />

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Streak cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4 flex flex-col items-center gap-1">
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="text-2xl font-bold">{calendarData?.streak.current ?? 0}</span>
            <span className="text-xs text-muted-foreground">현재 연속</span>
          </div>
          <div className="rounded-xl border bg-card p-4 flex flex-col items-center gap-1">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span className="text-2xl font-bold">{calendarData?.streak.longest ?? 0}</span>
            <span className="text-xs text-muted-foreground">최장 연속</span>
          </div>
        </div>

        {/* Month navigation header */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <span className="font-semibold text-base">
              {year}년 {month}월
            </span>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-2 flex justify-center">
            <Calendar
              month={new Date(year, month - 1, 1)}
              onMonthChange={(d) => {
                setYear(d.getFullYear());
                setMonth(d.getMonth() + 1);
              }}
              onDayClick={handleDayClick}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              showOutsideDays={false}
            />
          </div>
        )}

        {/* Note count for month */}
        {!isLoading && calendarData && (
          <p className="text-center text-sm text-muted-foreground">
            이번 달 차록: <span className="font-semibold text-foreground">{calendarData.dates.length}개</span>
          </p>
        )}
      </div>

      {/* Date Notes Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b">
            <DrawerTitle className="text-lg font-semibold">
              {selectedDate ? formatDateLabel(selectedDate) : ''}
            </DrawerTitle>
            <button
              onClick={() => {
                setDrawerOpen(false);
                navigate('/note/new');
              }}
              className="text-primary font-medium text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              기록 추가
            </button>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-3 space-y-3">
            {isLoadingNotes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : dateNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">이 날의 차록이 없습니다.</p>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/note/new');
                  }}
                  className="mt-3 text-primary font-medium text-sm"
                >
                  차록 작성하기
                </button>
              </div>
            ) : (
              dateNotes.map((note) => (
                <NoteCard key={note.id} note={note} showTeaName />
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </div>
  );
}
