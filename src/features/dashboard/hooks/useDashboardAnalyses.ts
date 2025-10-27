import { useDashboardContext } from '../context/DashboardContext';

export function useDashboardAnalyses() {
  const { state } = useDashboardContext();
  return {
    analyses: state.analyses.analyses,
    pagination: state.analyses.pagination,
    isLoading: state.analyses.isLoading,
    error: state.analyses.error,
  };
}
