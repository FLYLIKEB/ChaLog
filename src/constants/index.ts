/**
 * 애플리케이션 전역 상수
 */

// API 관련 상수
export const API_TIMEOUT = 30000; // 30초

// 평점 관련 상수
export const RATING_DEFAULT = 3;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_FIELDS_COUNT = 5;

// UI 관련 상수
export const NAVIGATION_DELAY = 500; // 밀리초
export const SEARCH_DEBOUNCE_DELAY = 600; // 밀리초

/** 앱 전체 페이지 배경 그라데이션 (라이트: 흰색→배경, 다크: 단색) */
export const PAGE_BG_GRADIENT =
  'bg-gradient-to-b from-white to-background dark:from-background dark:to-background';

// 차록 관련 상수
export const MIN_REVIEWS_FOR_TAGS = 3;

// 기본 태그 (차 상세 페이지용 - 평점 기반 계산)
export const DEFAULT_TEA_TAGS = ['깨끗함', '부드러움', '복합적'] as const;

// 노트 작성 시 추천 태그 목록
export const RECOMMENDED_NOTE_TAGS = [
  // 향미 관련
  '꽃향', '과일향', '허브향', '스모키', '꿀향', '견과향', '초콜릿향', '바닐라향',
  // 맛 관련
  '단맛', '쓴맛', '떫은맛', '신맛', '고소한맛', '부드러운맛',
  // 느낌/특성 관련
  '깔끔함', '부드러움', '진함', '가벼움', '풍부함', '복합적', '깨끗함', '강함',
  // 기타
  '온화함', '상쾌함', '따뜻함', '시원함', '은은함', '강렬함'
] as const;

// 차 종류 (6대다류 순서: 녹·백·황·청·홍·흑 + 보이차·대용차)
export const TEA_TYPES = ['녹차', '백차', '황차', '우롱차', '홍차', '흑차', '보이차', '대용차'] as const;

/** 차 종류별 색상 (칩/배지용) - 차 색감 연상 */
export const TEA_TYPE_COLORS: Record<(typeof TEA_TYPES)[number], string> = {
  녹차: 'bg-emerald-500',
  홍차: 'bg-rose-500',
  우롱차: 'bg-teal-500',
  백차: 'bg-stone-300 dark:bg-stone-500',
  흑차: 'bg-slate-700 dark:bg-slate-500',
  대용차: 'bg-slate-400 dark:bg-slate-600',
  황차: 'bg-amber-400 dark:bg-amber-500',
  보이차: 'bg-amber-800 dark:bg-amber-600',
};

// 새 차 등록 - 연도 선택 (현재년 ~ 1990)
const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

// 새 차 등록 - 자주 쓰는 산지
export const COMMON_ORIGINS = ['중국', '한국', '일본', '대만', '인도', '스리랑카', '베트남', '케냐'] as const;

// 새 차 등록 - 자주 쓰는 가격 (원)
export const COMMON_PRICES = [5000, 10000, 20000, 50000] as const;

/** 가격을 한글 단위로 표시 (예: 5000 → 5천, 20000 → 2만) */
export function formatPriceToKorean(price: number): string {
  if (price >= 10000) return `${price / 10000}만`;
  if (price >= 1000) return `${price / 1000}천`;
  return String(price);
}

// 새 차 등록 - 자주 쓰는 무게 (g) - 찻집 일반 판매단위
export const COMMON_WEIGHTS = [50, 100, 200, 250, 357] as const;

export type TeaType = typeof TEA_TYPES[number];

export const ONBOARDING_TEA_TYPES = TEA_TYPES;

export const ONBOARDING_FLAVOR_TAGS = [
  '꽃향',
  '과일향',
  '허브향',
  '스모키',
  '꿀향',
  '견과향',
  '초콜릿향',
  '바닐라향',
] as const;

