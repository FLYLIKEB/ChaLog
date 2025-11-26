import { Note } from '../types';

/**
 * 노트의 평점 데이터를 기반으로 상위 태그를 계산합니다.
 * 각 특성(richness, strength, smoothness, clarity, complexity)의 평균값을 계산하고
 * 상위 3개를 반환합니다.
 */
export function calculateTopTags(notes: Note[]): string[] {
  const DEFAULT_TAGS = ['깨끗함', '부드러움', '복합적'];
  const MIN_NOTES_FOR_TAGS = 0;

  if (notes.length === MIN_NOTES_FOR_TAGS) {
    return DEFAULT_TAGS;
  }

  const tagMapping: Record<string, keyof Note['ratings']> = {
    풍부함: 'richness',
    강함: 'strength',
    부드러움: 'smoothness',
    깨끗함: 'clarity',
    복합적: 'complexity',
  };

  const tagStats: Record<string, { sum: number; count: number }> = {
    풍부함: { sum: 0, count: 0 },
    강함: { sum: 0, count: 0 },
    부드러움: { sum: 0, count: 0 },
    깨끗함: { sum: 0, count: 0 },
    복합적: { sum: 0, count: 0 },
  };

  // 각 노트의 평점을 집계
  notes.forEach(note => {
    if (note.ratings) {
      Object.entries(tagMapping).forEach(([tag, key]) => {
        tagStats[tag].sum += note.ratings[key];
        tagStats[tag].count += 1;
      });
    }
  });

  // 평균값 계산 및 정렬
  const tagAverages = Object.entries(tagStats)
    .map(([tag, stats]) => ({
      tag,
      average: stats.count > 0 ? stats.sum / stats.count : 0,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 3)
    .map(item => item.tag);

  return tagAverages.length > 0 ? tagAverages : DEFAULT_TAGS;
}

/**
 * 태그를 표시하기 위한 최소 리뷰 개수
 */
export const MIN_REVIEWS_FOR_TAGS = 3;

