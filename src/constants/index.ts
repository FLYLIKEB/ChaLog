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

// 리뷰 관련 상수
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

// 차 종류
export const TEA_TYPES = ['녹차', '홍차', '우롱차', '백차', '흑차', '대용차', '황차', '보이차'] as const;

export type TeaType = typeof TEA_TYPES[number];

