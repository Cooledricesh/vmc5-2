import { apiClient } from '@/lib/remote/api-client';
import type { NewAnalysisRequest, NewAnalysisResponse } from './dto';

/**
 * 새로운 사주 분석을 생성합니다.
 * apiClient를 사용하여 자동으로 Authorization 헤더가 추가됩니다.
 */
export async function createAnalysis(
  request: NewAnalysisRequest
): Promise<NewAnalysisResponse> {
  const response = await apiClient.post<{ ok: boolean; data: NewAnalysisResponse }>(
    '/api/analyses/new',
    request
  );

  return response.data.data;
}
