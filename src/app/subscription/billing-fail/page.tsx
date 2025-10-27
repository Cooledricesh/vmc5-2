'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function BillingFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorCode = searchParams.get('code') || 'UNKNOWN';

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">결제 실패</CardTitle>
          <CardDescription>결제 처리 중 문제가 발생했습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">에러 코드: {errorCode}</p>
          <p>결제를 다시 시도해주세요. 문제가 계속되면 고객지원팀에 문의해주세요.</p>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/subscription')} className="flex-1">
              다시 시도
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
              홈으로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingFailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingFailContent />
    </Suspense>
  );
}
