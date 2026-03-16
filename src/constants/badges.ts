export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  threshold: string;
}

export interface LevelTier {
  threshold: number;
  level: number;
  name: string;
  description: string;
}

export const ALL_BADGES: BadgeDefinition[] = [
  { id: 'first_note', name: '첫 차록', description: '첫 번째 차록을 작성하세요', threshold: '조건: 차록 1개 작성' },
  { id: 'note_10', name: '차록 10개', description: '차록을 10개 작성하세요', threshold: '조건: 차록 10개 작성' },
  { id: 'note_50', name: '차록 50개', description: '차록을 50개 작성하세요', threshold: '조건: 차록 50개 작성' },
  { id: 'first_post', name: '첫 게시글', description: '첫 번째 게시글을 작성하세요', threshold: '조건: 게시글 1개 작성' },
  { id: 'cellar_10', name: '찻장 10개', description: '찻장에 차를 10개 등록하세요', threshold: '조건: 찻장 10개 등록' },
  { id: 'variety_5', name: '다양한 차 경험', description: '5종류 이상의 차를 기록하세요', threshold: '조건: 차 종류 5가지 기록' },
];

export const NOTE_LEVEL_TIERS: LevelTier[] = [
  { threshold: 0, level: 1, name: '입문', description: '차록의 세계에 첫 발을 내딛었어요' },
  { threshold: 5, level: 2, name: '수련', description: '꾸준히 차를 기록하고 있어요' },
  { threshold: 20, level: 3, name: '숙련', description: '차에 대한 깊은 안목이 생겼어요' },
  { threshold: 50, level: 4, name: '마스터', description: '차록의 대가, 진정한 다인이에요' },
];

export const POST_LEVEL_TIERS: LevelTier[] = [
  { threshold: 0, level: 1, name: '새싹', description: '커뮤니티에 막 합류했어요' },
  { threshold: 5, level: 2, name: '이웃', description: '활발하게 소통하고 있어요' },
  { threshold: 20, level: 3, name: '단골', description: '커뮤니티의 핵심 멤버예요' },
  { threshold: 50, level: 4, name: '터줏대감', description: '커뮤니티를 이끄는 리더예요' },
];

export const CELLAR_LEVEL_TIERS: LevelTier[] = [
  { threshold: 0, level: 1, name: '비어있음', description: '찻장을 채워보세요' },
  { threshold: 5, level: 2, name: '소장가', description: '소중한 차 컬렉션이 시작됐어요' },
  { threshold: 15, level: 3, name: '수집가', description: '다양한 차를 보유하고 있어요' },
  { threshold: 30, level: 4, name: '다완장', description: '최고의 차 컬렉터예요' },
];

export const LEVEL_CATEGORIES = [
  { key: 'noteLevel' as const, label: '차록', tiers: NOTE_LEVEL_TIERS },
  { key: 'postLevel' as const, label: '게시글', tiers: POST_LEVEL_TIERS },
  { key: 'cellarLevel' as const, label: '찻장', tiers: CELLAR_LEVEL_TIERS },
];
