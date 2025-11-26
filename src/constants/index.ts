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
export const SEARCH_DEBOUNCE_DELAY = 300; // 밀리초

// 리뷰 관련 상수
export const MIN_REVIEWS_FOR_TAGS = 3;

// 기본 태그
export const DEFAULT_TEA_TAGS = ['깨끗함', '부드러움', '복합적'] as const;

