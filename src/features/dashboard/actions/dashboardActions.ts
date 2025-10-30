import type { Dispatch } from 'react';
import { apiClient, extractApiErrorMessage, type ApiSuccessResponse } from '@/lib/remote/api-client';
import type { DashboardAction } from '../context/types';
import type {
  DashboardSummaryResponse,
  DashboardStatsResponse,
  AnalysesListResponse,
} from '../lib/dto';
import { hasProcessingAnalysis } from '../context/helpers';

export async function fetchSummary(dispatch: Dispatch<DashboardAction>) {
  dispatch({ type: 'FETCH_SUMMARY_START' });

  try {
    const response = await apiClient.get<ApiSuccessResponse<DashboardSummaryResponse>>('/api/dashboard/summary');
    dispatch({
      type: 'FETCH_SUMMARY_SUCCESS',
      payload: response.data.data,
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
    const response = await apiClient.get<ApiSuccessResponse<DashboardStatsResponse>>('/api/dashboard/stats');
    dispatch({
      type: 'FETCH_STATS_SUCCESS',
      payload: response.data.data,
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
    const response = await apiClient.get<ApiSuccessResponse<AnalysesListResponse>>('/api/analyses', { params });
    const analysesData = response.data.data as AnalysesListResponse;

    dispatch({
      type: 'FETCH_ANALYSES_SUCCESS',
      payload: analysesData,
    });

    // 처리 중인 분석 감지 시 폴링 시작
    if (hasProcessingAnalysis(analysesData.analyses)) {
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
