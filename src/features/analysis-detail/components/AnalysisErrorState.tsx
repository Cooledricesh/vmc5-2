'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type AnalysisErrorStateProps = {
  error: string;
};

export function AnalysisErrorState({ error }: AnalysisErrorStateProps) {
  const router = useRouter();

  const errorMessages: Record<string, { title: string; message: string }> = {
    ANALYSIS_NOT_FOUND: {
      title: '분석 결과를 찾을 수 없습니다',
      message: '삭제되었거나 존재하지 않는 분석입니다.',
    },
    FORBIDDEN: {
      title: '접근 권한이 없습니다',
      message: '이 분석 결과를 조회할 권한이 없습니다.',
    },
    UNAUTHORIZED: {
      title: '로그인이 필요합니다',
      message: '분석 결과를 조회하려면 로그인해주세요.',
    },
  };

  const errorInfo = errorMessages[error] || {
    title: '오류가 발생했습니다',
    message: error,
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl text-red-600">{errorInfo.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-gray-600">{errorInfo.message}</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => router.back()} variant="outline">
              이전으로
            </Button>
            <Button onClick={() => router.push('/dashboard')}>대시보드로 가기</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
