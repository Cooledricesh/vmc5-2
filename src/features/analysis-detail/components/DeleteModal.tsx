'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';
import { AlertTriangle } from 'lucide-react';

export function DeleteModal() {
  const { state, actions } = useAnalysisDetailContext();
  const { modals } = state.ui;

  if (!modals.delete.isOpen) return null;

  const handleDelete = async () => {
    await actions.deleteAnalysis();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            분석 결과 삭제
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-2">정말로 이 분석 결과를 삭제하시겠습니까?</p>
          <p className="text-sm text-red-600 font-medium">
            ⚠️ 삭제된 데이터는 복구할 수 없습니다.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={actions.closeDeleteModal}
            disabled={modals.delete.isProcessing}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={modals.delete.isProcessing}
          >
            {modals.delete.isProcessing ? '삭제 중...' : '삭제'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
