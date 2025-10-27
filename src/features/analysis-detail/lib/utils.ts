/**
 * 분석 상세보기 페이지 유틸 함수
 */

import { HEAVENLY_STEMS_KOREAN, EARTHLY_BRANCHES_KOREAN, FIVE_ELEMENTS_COLORS, AI_MODEL_BADGE, GENDER_ICON } from './constants';

/**
 * 천간지지 한글 변환 헬퍼
 * @param stem 천간지지 문자열 (예: "庚午")
 * @returns 한글 읽기 (예: "경오")
 */
export function convertToKorean(stem: string): string {
  const chars = stem.split('');
  return chars
    .map((char) => {
      return HEAVENLY_STEMS_KOREAN[char] || EARTHLY_BRANCHES_KOREAN[char] || char;
    })
    .join('');
}

/**
 * 오행 색상 반환
 * @param element 오행 키 (wood, fire, earth, metal, water)
 * @returns 색상 코드
 */
export function getFiveElementColor(element: keyof typeof FIVE_ELEMENTS_COLORS): string {
  return FIVE_ELEMENTS_COLORS[element];
}

/**
 * AI 모델 뱃지 텍스트 반환
 * @param model AI 모델 이름
 * @returns 뱃지 텍스트
 */
export function getAiModelBadge(model: string): string {
  return AI_MODEL_BADGE[model] || model;
}

/**
 * 성별 아이콘 반환
 * @param gender 성별 (male, female)
 * @returns 아이콘 이모지
 */
export function getGenderIcon(gender: string): string {
  return GENDER_ICON[gender] || '';
}

/**
 * 오행 차트 데이터 생성
 * @param fiveElements 오행 데이터
 * @returns 차트 데이터 배열
 */
export function createFiveElementsChartData(fiveElements: {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}) {
  return [
    { element: '목(木)', count: fiveElements.wood, fullMark: 5, color: FIVE_ELEMENTS_COLORS.wood },
    { element: '화(火)', count: fiveElements.fire, fullMark: 5, color: FIVE_ELEMENTS_COLORS.fire },
    { element: '토(土)', count: fiveElements.earth, fullMark: 5, color: FIVE_ELEMENTS_COLORS.earth },
    { element: '금(金)', count: fiveElements.metal, fullMark: 5, color: FIVE_ELEMENTS_COLORS.metal },
    { element: '수(水)', count: fiveElements.water, fullMark: 5, color: FIVE_ELEMENTS_COLORS.water },
  ];
}
