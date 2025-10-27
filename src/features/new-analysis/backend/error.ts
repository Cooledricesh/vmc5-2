/**
 * 새 분석하기 기능 에러 코드
 */
export const newAnalysisErrorCodes = {
  insufficientAnalysisCount: 'INSUFFICIENT_ANALYSIS_COUNT',
  analysisInProgress: 'ANALYSIS_IN_PROGRESS',
  geminiApiError: 'GEMINI_API_ERROR',
  analysisTimeout: 'ANALYSIS_TIMEOUT',
  inappropriateInput: 'INAPPROPRIATE_INPUT',
  validationError: 'VALIDATION_ERROR',
  databaseError: 'DATABASE_ERROR',
  unauthorized: 'UNAUTHORIZED',
  analysisNotFound: 'ANALYSIS_NOT_FOUND',
} as const;

export type NewAnalysisServiceError =
  typeof newAnalysisErrorCodes[keyof typeof newAnalysisErrorCodes];
