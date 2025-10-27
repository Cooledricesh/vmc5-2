'use client';

import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';

/**
 * 분석 데이터만 구독하는 Hook
 */
export function useAnalysisData() {
  const { state } = useAnalysisDetailContext();
  return state.analysis;
}
