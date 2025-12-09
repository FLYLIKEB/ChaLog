/**
 * 테스트에서 사용하는 상수들
 */
export const TEST_CONSTANTS = {
  DEFAULT_PASSWORD: 'password123',
  DEFAULT_USER_NAME: 'Test User',
  EMAIL_DOMAIN: '@example.com',
  TEST_TIMEOUT: 30000,
} as const;

/**
 * 테스트 데이터 기본값
 */
export const TEST_DEFAULTS = {
  TEA: {
    name: '테스트 차',
    year: 2023,
    type: '홍차',
  },
  NOTE: {
    rating: 4.5,
    ratings: {
      richness: 4,
      strength: 5,
      smoothness: 4,
      clarity: 4,
      complexity: 5,
    },
    memo: '테스트 노트입니다',
    isPublic: true,
  },
} as const;

