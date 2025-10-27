import { useDashboardContext } from '../context/DashboardContext';

export function useDashboardSummary() {
  const { state } = useDashboardContext();
  return state.userSummary;
}
