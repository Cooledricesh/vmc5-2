'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';
import { RefreshCw, Zap } from 'lucide-react';

export function ReanalyzeModal() {
  const { state, actions, computed } = useAnalysisDetailContext();
  const { modals } = state.ui;
  const { data } = state.analysis;

  if (!modals.reanalyze.isOpen || !data) return null;

  const handleReanalyze = async () => {
    await actions.reanalyzeAnalysis();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            재분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-gray-700 mb-2">다음 정보로 재분석을 시작하시겠습니까?</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">성함</span>
                <span className="text-sm font-medium">
                  {computed.genderIcon} {data.subject_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">생년월일</span>
                <span className="text-sm font-medium">{data.birth_date}</span>
              </div>
              {data.birth_time && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">출생시간</span>
                  <span className="text-sm font-medium">{data.birth_time}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900">남은 분석 횟수</span>
            </div>
            <Badge variant="default">{state.user.remaining_count}회</Badge>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            💡 재분석은 최신 AI 모델을 사용하여 더 정확한 결과를 제공합니다.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={actions.closeReanalyzeModal}
            disabled={modals.reanalyze.isProcessing}
          >
            취소
          </Button>
          <Button onClick={handleReanalyze} disabled={modals.reanalyze.isProcessing}>
            {modals.reanalyze.isProcessing ? '재분석 중...' : '재분석 시작'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
