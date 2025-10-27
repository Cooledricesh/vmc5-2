/**
 * 분석 상세보기 에러 코드 정의
 */

export const analysisDetailErrorCodes = {
  analysisNotFound: 'ANALYSIS_NOT_FOUND',
  forbidden: 'FORBIDDEN',
  unauthorized: 'UNAUTHORIZED',
  reanalysisForbidden: 'REANALYSIS_FORBIDDEN',
  insufficientCount: 'INSUFFICIENT_COUNT',
  databaseError: 'DATABASE_ERROR',
  validationError: 'VALIDATION_ERROR',
} as const;

export type AnalysisDetailServiceError =
  (typeof analysisDetailErrorCodes)[keyof typeof analysisDetailErrorCodes];
