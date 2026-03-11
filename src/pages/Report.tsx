import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/button';
import { notesApi } from '../lib/api';
import { Note } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useReportData, getAvailableMonths, formatMonthLabel } from '../hooks/useReportData';

const TEA_TYPE_CHART_COLORS: Record<string, string> = {
  '녹차': '#4ade80',
  '백차': '#fde68a',
  '황차': '#fbbf24',
  '청차/우롱차': '#38bdf8',
  '홍차': '#f87171',
  '흑차/보이차': '#a78bfa',
  '대용차': '#fb923c',
  '기타': '#94a3b8',
};

function getTypeColor(type: string): string {
  return TEA_TYPE_CHART_COLORS[type] ?? '#94a3b8';
}

export function Report() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const data = await notesApi.getAll(user.id, undefined, undefined, undefined, undefined, 'latest', 1, 500);
        setNotes(Array.isArray(data) ? data : (data as any)?.notes ?? []);
      } catch (error) {
        logger.error('Failed to fetch notes for report:', error);
        toast.error('차록 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, [user, authLoading, navigate]);

  const availableMonths = useMemo(() => getAvailableMonths(notes), [notes]);

  const report = useReportData(notes, selectedMonth);

  const handlePrevMonth = () => {
    if (!selectedMonth) {
      setSelectedMonth(availableMonths[0] ?? null);
      return;
    }
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1) setSelectedMonth(availableMonths[idx + 1]);
  };

  const handleNextMonth = () => {
    if (!selectedMonth) return;
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(availableMonths[idx - 1]);
    else setSelectedMonth(null);
  };

  const monthDiff = report.thisMonthCount - report.lastMonthCount;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="min-h-screen pb-20 flex flex-col">
        <Header title="차록 레포트" showBack onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <p className="text-4xl">🍵</p>
          <p className="text-base font-medium text-foreground">아직 차록이 없어요</p>
          <p className="text-sm text-muted-foreground">차록을 작성하면 나만의 통계를 볼 수 있어요.</p>
          <Button onClick={() => navigate('/note/new')} className="mt-2">첫 차록 쓰기</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 flex flex-col overflow-hidden">
      <Header title="차록 레포트" showBack onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">

        {/* 월 선택기 */}
        <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-2.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={availableMonths.length === 0 || selectedMonth === availableMonths[availableMonths.length - 1]}
            className="p-1 rounded-full hover:bg-background/60 disabled:opacity-30 transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">
            {selectedMonth ? formatMonthLabel(selectedMonth) : '전체 기간'}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!selectedMonth}
            className="p-1 rounded-full hover:bg-background/60 disabled:opacity-30 transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">이번 달</p>
            <p className="text-xl font-bold text-primary">{report.thisMonthCount}</p>
            <p className="text-xs text-muted-foreground">건</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">전월 대비</p>
            <div className="flex items-center justify-center gap-0.5">
              {monthDiff > 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : monthDiff < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <p className={cn(
                'text-xl font-bold',
                monthDiff > 0 ? 'text-emerald-500' : monthDiff < 0 ? 'text-red-400' : 'text-muted-foreground',
              )}>
                {monthDiff > 0 ? `+${monthDiff}` : monthDiff}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">건</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">총 차록</p>
            <p className="text-xl font-bold text-foreground">{report.totalCount}</p>
            <p className="text-xs text-muted-foreground">건</p>
          </div>
        </div>

        {/* 차 종류별 비율 */}
        {report.teaTypeDistribution.length > 0 && (
          <Section title="☕ 차 종류별 비율" spacing="sm">
            <div className="bg-card rounded-xl p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={report.teaTypeDistribution}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ type, percentage }) => `${type} ${percentage}%`}
                    labelLine={false}
                  >
                    {report.teaTypeDistribution.map((entry) => (
                      <Cell key={entry.type} fill={getTypeColor(entry.type)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}건`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
                {report.teaTypeDistribution.map((entry) => (
                  <div key={entry.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getTypeColor(entry.type) }}
                    />
                    {entry.type} ({entry.count}건)
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* 평점 분포 */}
        <Section title="⭐ 평점 분포" spacing="sm">
          <div className="bg-card rounded-xl p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={report.ratingDistribution} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [`${value}건`, '차록 수']} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* 자주 마신 차 Top 5 */}
        {report.topTeas.length > 0 && (
          <Section title="🏆 자주 마신 차 Top 5" spacing="sm">
            <div className="bg-card rounded-xl overflow-hidden">
              {report.topTeas.map((tea, index) => (
                <div
                  key={tea.teaName}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0"
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-orange-300 text-orange-800' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{tea.teaName}</span>
                  <span className="text-sm text-muted-foreground shrink-0">{tea.count}번</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 자주 쓴 태그 */}
        {report.topTags.length > 0 && (
          <Section title="🏷️ 자주 쓴 향미 태그" spacing="sm">
            <div className="bg-card rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                {report.topTags.map((tag, index) => {
                  const maxCount = report.topTags[0].count;
                  const ratio = tag.count / maxCount;
                  return (
                    <span
                      key={tag.tag}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/60 transition-colors',
                        index === 0 ? 'bg-primary/15 text-primary font-semibold' :
                        ratio >= 0.6 ? 'bg-primary/8 text-foreground font-medium' :
                        'bg-muted/60 text-muted-foreground text-sm',
                      )}
                    >
                      #{tag.tag}
                      <span className="text-xs opacity-60">({tag.count})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* 월간 인사이트 */}
        {report.monthlyInsight && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-xs font-medium text-primary mb-1">💡 이번 달 인사이트</p>
            <p className="text-sm text-foreground">{report.monthlyInsight}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
