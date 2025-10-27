'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <CardTitle className="text-green-600">구독 완료</CardTitle>
          </div>
          <CardDescription>Pro 요금제 구독이 성공적으로 완료되었습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Pro 플랜 혜택</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>월 10회 프리미엄 AI 분석</li>
              <li>상세한 사주 해석</li>
              <li>운세 예측 및 조언</li>
              <li>우선 고객 지원</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            이제 Pro 플랜의 모든 기능을 이용하실 수 있습니다. 구독 관리는 언제든지 구독 관리 페이지에서 하실 수
            있습니다.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/dashboard')} className="flex-1">
              대시보드로
            </Button>
            <Button variant="outline" onClick={() => router.push('/subscription')} className="flex-1">
              구독 관리
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
