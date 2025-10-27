'use client';

import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';

/**
 * 재분석 가능 여부를 반환하는 Hook (Derived State)
 */
export function useCanReanalyze() {
  const { computed } = useAnalysisDetailContext();
  return computed.canReanalyze;
}
