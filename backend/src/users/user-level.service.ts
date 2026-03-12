import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface LevelInfo {
  level: number;
  name: string;
  count: number;
  nextThreshold: number | null;
}

export interface BadgeInfo {
  id: string;
  name: string;
}

const NOTE_LEVELS = [
  { threshold: 0, level: 1, name: '입문' },
  { threshold: 5, level: 2, name: '수련' },
  { threshold: 20, level: 3, name: '숙련' },
  { threshold: 50, level: 4, name: '마스터' },
];

const POST_LEVELS = [
  { threshold: 0, level: 1, name: '새싹' },
  { threshold: 5, level: 2, name: '이웃' },
  { threshold: 20, level: 3, name: '단골' },
  { threshold: 50, level: 4, name: '터줏대감' },
];

const CELLAR_LEVELS = [
  { threshold: 0, level: 1, name: '비어있음' },
  { threshold: 5, level: 2, name: '소장가' },
  { threshold: 15, level: 3, name: '수집가' },
  { threshold: 30, level: 4, name: '다완장' },
];

function computeLevel(
  count: number,
  tiers: typeof NOTE_LEVELS,
): LevelInfo {
  let current = tiers[0];
  for (const tier of tiers) {
    if (count >= tier.threshold) current = tier;
  }
  const idx = tiers.indexOf(current);
  const next = tiers[idx + 1] ?? null;
  return {
    level: current.level,
    name: current.name,
    count,
    nextThreshold: next?.threshold ?? null,
  };
}

@Injectable()
export class UserLevelService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async getUserLevel(userId: number) {
    const [[noteRow], [postRow], [cellarRow], [teaTypeRow]] = await Promise.all([
      this.dataSource.query<{ cnt: string }[]>('SELECT COUNT(*) as cnt FROM notes WHERE userId = ?', [userId]),
      this.dataSource.query<{ cnt: string }[]>('SELECT COUNT(*) as cnt FROM posts WHERE userId = ?', [userId]),
      this.dataSource.query<{ cnt: string }[]>('SELECT COUNT(*) as cnt FROM cellar_items WHERE userId = ?', [userId]),
      this.dataSource.query<{ cnt: string }[]>(
        'SELECT COUNT(DISTINCT t.type) as cnt FROM notes n JOIN teas t ON t.id = n.teaId WHERE n.userId = ?',
        [userId],
      ),
    ]);

    const noteCount = parseInt(noteRow.cnt, 10);
    const postCount = parseInt(postRow.cnt, 10);
    const cellarCount = parseInt(cellarRow.cnt, 10);
    const teaTypeCount = parseInt(teaTypeRow.cnt, 10);

    const badges = this.computeBadges({ noteCount, postCount, cellarCount, teaTypeCount });

    return {
      noteLevel: computeLevel(noteCount, NOTE_LEVELS),
      postLevel: computeLevel(postCount, POST_LEVELS),
      cellarLevel: computeLevel(cellarCount, CELLAR_LEVELS),
      badges,
    };
  }

  private computeBadges(counts: {
    noteCount: number;
    postCount: number;
    cellarCount: number;
    teaTypeCount: number;
  }): BadgeInfo[] {
    const badges: BadgeInfo[] = [];
    if (counts.noteCount >= 1) badges.push({ id: 'first_note', name: '첫 차록' });
    if (counts.noteCount >= 10) badges.push({ id: 'note_10', name: '차록 10개' });
    if (counts.noteCount >= 50) badges.push({ id: 'note_50', name: '차록 50개' });
    if (counts.postCount >= 1) badges.push({ id: 'first_post', name: '첫 게시글' });
    if (counts.cellarCount >= 10) badges.push({ id: 'cellar_10', name: '찻장 10개' });
    if (counts.teaTypeCount >= 5) badges.push({ id: 'variety_5', name: '다양한 차 경험' });
    return badges;
  }
}
