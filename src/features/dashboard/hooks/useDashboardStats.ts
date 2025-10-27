import { useDashboardContext } from '../context/DashboardContext';

export function useDashboardStats() {
  const { state } = useDashboardContext();
  return state.stats;
}
