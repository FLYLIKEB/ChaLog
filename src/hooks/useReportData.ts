import { useMemo } from 'react';
import { Note } from '../types';

export interface ReportData {
  teaTypeDistribution: { type: string; count: number; percentage: number }[];
  ratingDistribution: { rating: string; count: number }[];
  topTeas: { teaName: string; count: number }[];
  topTags: { tag: string; count: number }[];
  thisMonthCount: number;
  lastMonthCount: number;
  totalCount: number;
  monthlyInsight: string | null;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function useReportData(notes: Note[], selectedMonth: string | null): ReportData {
  return useMemo(() => {
    const now = new Date();
    const thisMonth = toMonthKey(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = toMonthKey(lastMonthDate);

    const filteredNotes = selectedMonth
      ? notes.filter((n) => toMonthKey(new Date(n.createdAt)) === selectedMonth)
      : notes;

    const currentKey = selectedMonth ?? thisMonth;
    const [cy, cm] = currentKey.split('-').map(Number);
    const prevKey = toMonthKey(new Date(cy, cm - 2, 1));

    const thisMonthNotes = notes.filter((n) => toMonthKey(new Date(n.createdAt)) === currentKey);
    const lastMonthNotes = notes.filter((n) => toMonthKey(new Date(n.createdAt)) === prevKey);

    // 차 종류별 분포
    const typeMap: Record<string, number> = {};
    filteredNotes.forEach((n) => {
      const type = n.teaType || '기타';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    const total = filteredNotes.length;
    const teaTypeDistribution = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    // 평점 분포
    const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredNotes.forEach((n) => {
      if (n.overallRating != null) {
        const r = Math.round(n.overallRating);
        if (r >= 1 && r <= 5) ratingMap[r] = (ratingMap[r] || 0) + 1;
      }
    });
    const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: `${r}점`,
      count: ratingMap[r],
    }));

    // 자주 마신 차 Top 5
    const teaMap: Record<string, number> = {};
    filteredNotes.forEach((n) => {
      if (n.teaName) teaMap[n.teaName] = (teaMap[n.teaName] || 0) + 1;
    });
    const topTeas = Object.entries(teaMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([teaName, count]) => ({ teaName, count }));

    // 자주 쓴 태그 Top 8
    const tagMap: Record<string, number> = {};
    filteredNotes.forEach((n) => {
      (n.tags || []).forEach((tag) => {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    // 월간 인사이트 (전월 대비 가장 많이 증가한 차 종류)
    let monthlyInsight: string | null = null;
    if (thisMonthNotes.length > 0 && lastMonthNotes.length > 0) {
      const thisTypeMap: Record<string, number> = {};
      thisMonthNotes.forEach((n) => {
        const type = n.teaType || '기타';
        thisTypeMap[type] = (thisTypeMap[type] || 0) + 1;
      });
      const lastTypeMap: Record<string, number> = {};
      lastMonthNotes.forEach((n) => {
        const type = n.teaType || '기타';
        lastTypeMap[type] = (lastTypeMap[type] || 0) + 1;
      });

      let maxIncrease = 0;
      let maxIncreaseType = '';
      Object.entries(thisTypeMap).forEach(([type, count]) => {
        const lastCount = lastTypeMap[type] || 0;
        if (lastCount > 0) {
          const increase = Math.round(((count - lastCount) / lastCount) * 100);
          if (increase > maxIncrease) {
            maxIncrease = increase;
            maxIncreaseType = type;
          }
        }
      });
      if (maxIncreaseType && maxIncrease > 0) {
        monthlyInsight = `이번 달에는 지난달보다 ${maxIncreaseType}를 ${maxIncrease}% 더 마셨어요!`;
      }
    }

    return {
      teaTypeDistribution,
      ratingDistribution,
      topTeas,
      topTags,
      thisMonthCount: thisMonthNotes.length,
      lastMonthCount: lastMonthNotes.length,
      totalCount: notes.length,
      monthlyInsight,
    };
  }, [notes, selectedMonth]);
}

/** 노트 목록에서 존재하는 연-월 목록 반환 (내림차순) */
export function getAvailableMonths(notes: Note[]): string[] {
  const set = new Set<string>();
  notes.forEach((n) => set.add(toMonthKey(new Date(n.createdAt))));
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

/** "2026-03" → "2026년 3월" */
export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${y}년 ${parseInt(m)}월`;
}
