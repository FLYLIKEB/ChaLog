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

/** 가로 스크롤 카드 레이아웃 관련 상수 */
export const CARD_WIDTH = {
  DEFAULT: 'w-[200px]', // 인기 다우 등
  WIDE: 'w-[300px]',    // 차 카드, 차록 카드 등
} as const;

/** 가로 스크롤 카드 컨테이너 공통 클래스 */
export const CARD_CONTAINER_CLASSES = 'flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide items-stretch';

/** 가로 스크롤 카드 아이템 래퍼 공통 클래스 (너비는 CARD_WIDTH와 조합) */
export const CARD_ITEM_WRAPPER_CLASSES = 'shrink-0 flex';

/** 로딩 시 스켈레톤용 가로 스크롤 컨테이너 (스크롤 없음) */
export const CARD_SKELETON_CONTAINER_CLASSES = 'flex gap-3 overflow-x-hidden';

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

// 차 종류 (산화도 낮은 순: 녹→백→황→우롱→홍→흑→보이, + 대용차)
export const TEA_TYPES = ['녹차', '백차', '황차', '우롱차', '홍차', '흑차', '보이차', '대용차'] as const;

/** 차 종류별 색상 (칩/배지용) - 파스텔 톤, 차 색감 연상 */
export const TEA_TYPE_COLORS: Record<(typeof TEA_TYPES)[number], string> = {
  녹차: 'bg-emerald-300 dark:bg-emerald-400',
  백차: 'bg-stone-200 dark:bg-stone-400',
  황차: 'bg-amber-300 dark:bg-amber-400',
  우롱차: 'bg-blue-400 dark:bg-blue-500',
  홍차: 'bg-rose-300 dark:bg-rose-400',
  흑차: 'bg-amber-500 dark:bg-amber-600',
  보이차: 'bg-amber-700 dark:bg-amber-800',
  대용차: 'bg-slate-300 dark:bg-slate-500',
};

/** 차 종류별 이미지 없을 때 플레이스홀더 배경 (차록 카드용) */
export const TEA_TYPE_PLACEHOLDER_BG: Record<(typeof TEA_TYPES)[number], string> = {
  녹차: 'bg-emerald-300/40 dark:bg-emerald-400/30',
  백차: 'bg-stone-200/80 dark:bg-stone-400/30',
  황차: 'bg-amber-300/40 dark:bg-amber-400/30',
  우롱차: 'bg-blue-400/40 dark:bg-blue-500/30',
  홍차: 'bg-rose-300/40 dark:bg-rose-400/30',
  흑차: 'bg-amber-500/40 dark:bg-amber-600/30',
  보이차: 'bg-amber-700/40 dark:bg-amber-800/30',
  대용차: 'bg-slate-300/40 dark:bg-slate-500/30',
};

/** 차 종류별 글자 색 (배지 텍스트용) */
export const TEA_TYPE_TEXT_COLORS: Record<(typeof TEA_TYPES)[number], string> = {
  녹차: 'text-emerald-700 dark:text-emerald-400',
  백차: 'text-stone-600 dark:text-stone-400',
  황차: 'text-amber-700 dark:text-amber-400',
  우롱차: 'text-blue-600 dark:text-blue-400',
  홍차: 'text-rose-700 dark:text-rose-400',
  흑차: 'text-amber-800 dark:text-amber-500',
  보이차: 'text-amber-900 dark:text-amber-600',
  대용차: 'text-slate-600 dark:text-slate-400',
};

// 새 차 등록 - 연도 선택 (현재년 ~ 1990)
const currentYear = new Date().getFullYear();
export const CURRENT_YEAR = currentYear;
export const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

// 새 차 등록 - 기본 산지 (차종 미선택 시)
export const COMMON_ORIGINS = ['중국', '한국', '일본', '대만', '인도', '스리랑카', '베트남', '케냐'] as const;

/** 차 종류별 추천 산지 - 구체적 지역명 (차종에 따라 다른 버튼 표시) */
export const TEA_TYPE_ORIGINS: Record<(typeof TEA_TYPES)[number], readonly string[]> = {
  녹차: ['한국 제주도', '한국 보성', '한국 하동', '일본 시즈오카', '일본 교토 우지', '일본 가고시마', '중국 용정', '중국 푸젠', '대만 핑린', '베트남 탄응옌'],
  백차: ['중국 푸젠 복정', '중국 푸젠 정화', '중국 푸젠 무이산', '대만 핑린', '중국 건강', '인도 다즐링'],
  황차: ['중국 쓰촨 몽정산', '중국 푸젠', '중국 쓰촨', '중국 후난', '대만'],
  우롱차: ['중국 푸젠 무이산', '중국 푸젠 안시', '중국 광동 펑황단총', '중국 운남성', '대만 동정', '대만 문산', '대만 아리산'],
  홍차: ['인도 다즐링', '인도 아삼', '인도 닐기리', '스리랑카 누완엘리야', '스리랑카 실론', '케냐', '중국 운남', '중국 푸젠', '대만 동정'],
  흑차: ['중국 안후이 안화', '중국 후난 안화', '중국 광시', '중국 쓰촨 아안', '중국 허베이'],
  보이차: ['중국 운남성 시솽반나', '중국 운남성 란창강', '중국 운남성', '미얀마', '라오스', '베트남'],
  대용차: ['한국 제주도', '한국 보성', '중국 구이저우', '일본 홋카이도', '대만 핑린', '인도 다즐링', '베트남 탄응옌'],
};

/** 차종에 따른 산지 버튼 목록 반환 (미선택 시 COMMON_ORIGINS) */
export function getOriginsForTeaType(type: string): readonly string[] {
  if (type && type in TEA_TYPE_ORIGINS) {
    return TEA_TYPE_ORIGINS[type as (typeof TEA_TYPES)[number]];
  }
  return COMMON_ORIGINS;
}

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

