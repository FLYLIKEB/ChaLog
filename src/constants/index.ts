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
export const CURRENT_YEAR = currentYear;
export const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

// 새 차 등록 - 기본 산지 (차종 미선택 시)
export const COMMON_ORIGINS = ['중국', '한국', '일본', '대만', '인도', '스리랑카', '베트남', '케냐'] as const;

/** 차 종류별 추천 산지 - 구체적 지역명 (차종에 따라 다른 버튼 표시) */
export const TEA_TYPE_ORIGINS: Record<(typeof TEA_TYPES)[number], readonly string[]> = {
  녹차: ['한국 제주도', '한국 보성', '한국 하동', '일본 시즈오카', '일본 교토 우지', '일본 가고시마', '중국 용정', '중국 푸젠', '대만 핑린', '베트남 탄응옌'],
  백차: ['중국 푸젠 복정', '중국 푸젠 정화', '중국 푸젠 무이산', '대만 핑린', '중국 건강', '인도 다즐링'],
  황차: ['중국 쓰촨 몽정산', '중국 푸젠', '중국 쓰촨', '중국 후난', '대만'],
  우롱차: ['중국 운남성', '중국 푸젠 무이산', '중국 푸젠 안시', '대만 동정', '대만 문산', '대만 아리산', '중국 광동 펑황단총'],
  홍차: ['인도 다즐링', '인도 아삼', '인도 닐기리', '스리랑카 누완엘리야', '스리랑카 실론', '케냐', '중국 운남', '중국 푸젠', '대만 동정'],
  흑차: ['중국 운남 시솽반나', '중국 운남 란창강', '중국 안후이 안화', '중국 후난 안화', '중국 운남', '중국 후난'],
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

/**
 * 차 이름 키워드 → 차 종류 자동 선택 매핑
 * 키워드가 이름에 포함되면 해당 종류를 자동 선택
 */
export const TEA_NAME_KEYWORD_MAP: { keyword: string; type: TeaType }[] = [
  // 우롱차
  { keyword: '철관음', type: '우롱차' },
  { keyword: '동방미인', type: '우롱차' },
  { keyword: '봉황단총', type: '우롱차' },
  { keyword: '펑황단총', type: '우롱차' },
  { keyword: '무이암차', type: '우롱차' },
  { keyword: '대홍포', type: '우롱차' },
  { keyword: '동정', type: '우롱차' },
  { keyword: '아리산', type: '우롱차' },
  // 녹차
  { keyword: '용정', type: '녹차' },
  { keyword: '시즈오카', type: '녹차' },
  { keyword: '말차', type: '녹차' },
  { keyword: '전차', type: '녹차' },
  { keyword: '옥로', type: '녹차' },
  // 홍차
  { keyword: '다즐링', type: '홍차' },
  { keyword: '아삼', type: '홍차' },
  { keyword: '실론', type: '홍차' },
  { keyword: '정산소종', type: '홍차' },
  { keyword: '기문', type: '홍차' },
  { keyword: '딤불라', type: '홍차' },
  // 백차
  { keyword: '백호은침', type: '백차' },
  { keyword: '백모단', type: '백차' },
  { keyword: '수미', type: '백차' },
  // 보이차
  { keyword: '보이', type: '보이차' },
  { keyword: '생차', type: '보이차' },
  { keyword: '숙차', type: '보이차' },
  // 황차
  { keyword: '군산은침', type: '황차' },
  { keyword: '몽정황아', type: '황차' },
];

/**
 * 차 이름으로부터 자동 선택할 차 종류를 반환
 * 매칭되는 키워드가 없으면 null 반환
 */
export function guessTeaTypeFromName(name: string): TeaType | null {
  const lower = name.toLowerCase();
  for (const { keyword, type } of TEA_NAME_KEYWORD_MAP) {
    if (lower.includes(keyword.toLowerCase())) {
      return type;
    }
  }
  return null;
}

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

