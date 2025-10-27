import { apiClient } from '@/lib/remote/api-client';
import type { AnalysisDetailAction } from '../lib/types';
import type { AnalysisDetailResponse, ReanalyzeRequest } from '../lib/dto';

/**
 * 분석 조회
 */
export async function fetchAnalysis(
  dispatch: React.Dispatch<AnalysisDetailAction>,
  analysisId: string
) {
  dispatch({ type: 'FETCH_ANALYSIS_START' });

  try {
    const response = await apiClient.get<{ data: AnalysisDetailResponse }>(
      `/api/analyses/${analysisId}`
    );
    dispatch({
      type: 'FETCH_ANALYSIS_SUCCESS',
      payload: response.data.data,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
    dispatch({
      type: 'FETCH_ANALYSIS_ERROR',
      payload: { error: errorMessage },
    });
  }
}

/**
 * 분석 삭제
 */
export async function deleteAnalysis(
  dispatch: React.Dispatch<AnalysisDetailAction>,
  analysisId: string
) {
  dispatch({ type: 'DELETE_START' });

  try {
    await apiClient.delete(`/api/analyses/${analysisId}`);
    dispatch({ type: 'DELETE_SUCCESS' });
    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다';
    dispatch({
      type: 'DELETE_ERROR',
      payload: { error: errorMessage },
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * 재분석 요청
 */
export async function reanalyzeAnalysis(
  dispatch: React.Dispatch<AnalysisDetailAction>,
  request: ReanalyzeRequest
) {
  dispatch({ type: 'REANALYZE_START' });

  try {
    const response = await apiClient.post<{
      data: { new_analysis_id: string; remaining_count: number };
    }>('/api/analyses/reanalyze', request);
    dispatch({
      type: 'REANALYZE_SUCCESS',
      payload: { new_analysis_id: response.data.data.new_analysis_id },
    });
    return { success: true, new_analysis_id: response.data.data.new_analysis_id };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : '재분석 중 오류가 발생했습니다';
    dispatch({
      type: 'REANALYZE_ERROR',
      payload: { error: errorMessage },
    });
    return { success: false, error: errorMessage };
  }
}
