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
    overallRating: 4.5,
    isRatingIncluded: true,
    axisValues: [
      { axisId: 1, value: 4 }, // RICHNESS
      { axisId: 2, value: 5 }, // STRENGTH
      { axisId: 3, value: 4 }, // SMOOTHNESS
      { axisId: 4, value: 4 }, // CLARITY
      { axisId: 5, value: 5 }, // COMPLEXITY
    ],
    memo: '테스트 노트입니다',
    isPublic: true,
  },
} as const;

