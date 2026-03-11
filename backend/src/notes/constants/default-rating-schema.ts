/**
 * 기본 평가 스키마 및 축 정보
 */

export interface DefaultRatingAxisData {
  code: string;
  nameKo: string;
  nameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  minValue: number;
  maxValue: number;
  stepValue: number;
  displayOrder: number;
  isRequired: boolean;
}

export interface DefaultRatingSchemaData {
  code: string;
  version: string;
  nameKo: string;
  nameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  overallMinValue: number;
  overallMaxValue: number;
  overallStep: number;
  isActive: boolean;
}

/**
 * 기본 평가 스키마 정보
 */
export const DEFAULT_RATING_SCHEMA: DefaultRatingSchemaData = {
  code: 'STANDARD',
  version: '1.0.0',
  nameKo: '차록 표준 평가',
  nameEn: 'ChaLog Standard Rating',
  descriptionKo: '차록의 기본 평가 축 세트',
  descriptionEn: 'ChaLog default rating axis set',
  overallMinValue: 1,
  overallMaxValue: 5,
  overallStep: 0.5,
  isActive: true,
};

/**
 * 기본 평가 축 정보 목록
 */
export const DEFAULT_RATING_AXES: DefaultRatingAxisData[] = [
  {
    code: 'RICHNESS',
    nameKo: '풍부함',
    nameEn: 'Richness',
    descriptionKo: '차의 풍부한 맛과 향',
    descriptionEn: 'Richness of taste and aroma',
    minValue: 1,
    maxValue: 5,
    stepValue: 0.5,
    displayOrder: 1,
    isRequired: true,
  },
  {
    code: 'STRENGTH',
    nameKo: '강도',
    nameEn: 'Strength',
    descriptionKo: '차의 강한 맛',
    descriptionEn: 'Strength of taste',
    minValue: 1,
    maxValue: 5,
    stepValue: 0.5,
    displayOrder: 2,
    isRequired: true,
  },
  {
    code: 'SMOOTHNESS',
    nameKo: '부드러움',
    nameEn: 'Smoothness',
    descriptionKo: '차의 부드러운 맛',
    descriptionEn: 'Smoothness of taste',
    minValue: 1,
    maxValue: 5,
    stepValue: 0.5,
    displayOrder: 3,
    isRequired: true,
  },
  {
    code: 'CLARITY',
    nameKo: '명확함',
    nameEn: 'Clarity',
    descriptionKo: '차의 명확한 맛',
    descriptionEn: 'Clarity of taste',
    minValue: 1,
    maxValue: 5,
    stepValue: 0.5,
    displayOrder: 4,
    isRequired: true,
  },
  {
    code: 'COMPLEXITY',
    nameKo: '복잡성',
    nameEn: 'Complexity',
    descriptionKo: '차의 복잡한 맛',
    descriptionEn: 'Complexity of taste',
    minValue: 1,
    maxValue: 5,
    stepValue: 0.5,
    displayOrder: 5,
    isRequired: true,
  },
];
