import type { AnalysisItem } from '../lib/dto';

/**
 * 배열이 undefined인 경우를 방어하는 헬퍼 함수
 * @param arr - 배열 또는 undefined
 * @returns 안전한 배열 (undefined인 경우 빈 배열 반환)
 */
export function ensureArray<T>(arr: T[] | undefined | null): T[] {
  return arr || [];
}

/**
 * 분석 목록에서 처리 중인 항목이 있는지 확인
 * @param analyses - 분석 항목 배열
 * @returns 처리 중인 항목 존재 여부
 */
export function hasProcessingAnalysis(analyses: AnalysisItem[] | undefined | null): boolean {
  return ensureArray(analyses).some((a) => a.status === 'processing');
}

/**
 * 분석 목록이 비어있는지 확인 (로딩 상태 고려)
 * @param analyses - 분석 항목 배열
 * @param isLoading - 로딩 상태
 * @returns 비어있음 여부
 */
export function isAnalysesEmpty(
  analyses: AnalysisItem[] | undefined | null,
  isLoading: boolean,
): boolean {
  return ensureArray(analyses).length === 0 && !isLoading;
}
