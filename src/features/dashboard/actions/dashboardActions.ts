import type { Dispatch } from 'react';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import type { DashboardAction } from '../context/types';
import type {
  DashboardSummaryResponse,
  DashboardStatsResponse,
  AnalysesListResponse,
} from '../lib/dto';

export async function fetchSummary(dispatch: Dispatch<DashboardAction>) {
  dispatch({ type: 'FETCH_SUMMARY_START' });

  try {
    const response = await apiClient.get<DashboardSummaryResponse>('/api/dashboard/summary');
    dispatch({
      type: 'FETCH_SUMMARY_SUCCESS',
      payload: response.data,
    });
  } catch (error: unknown) {
    const errorMessage = extractApiErrorMessage(error, '사용자 정보를 불러오는 데 실패했습니다');
    dispatch({
      type: 'FETCH_SUMMARY_ERROR',
      payload: { error: errorMessage },
    });
  }
}

export async function fetchStats(dispatch: Dispatch<DashboardAction>) {
  dispatch({ type: 'FETCH_STATS_START' });

  try {
    const response = await apiClient.get<DashboardStatsResponse>('/api/dashboard/stats');
    dispatch({
      type: 'FETCH_STATS_SUCCESS',
      payload: response.data,
    });
  } catch (error: unknown) {
    const errorMessage = extractApiErrorMessage(error, '통계 정보를 불러오는 데 실패했습니다');
    dispatch({
      type: 'FETCH_STATS_ERROR',
      payload: { error: errorMessage },
    });
  }
}

export async function fetchAnalyses(
  dispatch: Dispatch<DashboardAction>,
  params: { period: string; sort: string; page: number; limit: number },
) {
  dispatch({ type: 'FETCH_ANALYSES_START' });

  try {
    const response = await apiClient.get<AnalysesListResponse>('/api/analyses', { params });
    dispatch({
      type: 'FETCH_ANALYSES_SUCCESS',
      payload: (response.data || { analyses: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }) as any,
    });

    // 처리 중인 분석 감지 시 폴링 시작
    const hasProcessing = response.data.analyses.some((a) => a.status === 'processing');
    if (hasProcessing) {
      dispatch({ type: 'START_POLLING' });
    } else {
      dispatch({ type: 'STOP_POLLING' });
    }
  } catch (error: unknown) {
    const errorMessage = extractApiErrorMessage(error, '분석 목록을 불러오는 데 실패했습니다');
    dispatch({
      type: 'FETCH_ANALYSES_ERROR',
      payload: { error: errorMessage },
    });
  }
}
