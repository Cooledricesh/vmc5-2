'use client';

import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';

/**
 * 활성 탭 상태만 구독하는 Hook
 */
export function useActiveTab() {
  const { state, actions } = useAnalysisDetailContext();
  return {
    activeTab: state.ui.activeTab,
    setActiveTab: actions.setActiveTab,
  };
}
