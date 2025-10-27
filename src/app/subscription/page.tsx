'use client';

import { SubscriptionProvider } from '@/features/subscription/context/SubscriptionContext';
import { useSubscriptionStatus } from '@/features/subscription/hooks/useSubscription';
import { usePaymentProcess } from '@/features/subscription/hooks/usePaymentProcess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateKorean } from '@/lib/utils/date';

function SubscriptionContent() {
  const { subscription, isActive, isPendingCancellation, isFree, canSubscribe } = useSubscriptionStatus();
  const { initiateSubscription } = usePaymentProcess();

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>구독 관리</CardTitle>
              <CardDescription>Pro 요금제 구독을 관리하세요</CardDescription>
            </div>
            <Badge variant={isActive ? 'default' : isPendingCancellation ? 'secondary' : 'outline'}>
              {isActive ? 'Pro 구독 중' : isPendingCancellation ? '해지 예정' : '무료 플랜'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFree && (
            <div className="space-y-4">
              <p>월 {subscription.price.toLocaleString()}원으로 Pro 플랜을 이용하세요</p>
              <ul className="list-disc list-inside space-y-1">
                <li>월 10회 프리미엄 AI 분석</li>
                <li>상세한 사주 해석</li>
                <li>운세 예측</li>
              </ul>
              {canSubscribe && (
                <Button onClick={initiateSubscription} size="lg" className="w-full">
                  Pro 구독하기
                </Button>
              )}
            </div>
          )}

          {isActive && (
            <div className="space-y-2">
              <p>
                <strong>다음 결제일:</strong>{' '}
                {subscription.next_payment_date ? formatDateKorean(subscription.next_payment_date) : 'N/A'}
              </p>
              <p>
                <strong>결제 카드:</strong> {subscription.card_type} **** {subscription.card_last_4digits}
              </p>
              <p>
                <strong>월 분석 가능 횟수:</strong> {subscription.monthly_analysis_count}회
              </p>
            </div>
          )}

          {isPendingCancellation && (
            <div className="space-y-2">
              <p className="text-yellow-600">
                <strong>혜택 종료일:</strong>{' '}
                {subscription.effective_until ? formatDateKorean(subscription.effective_until) : 'N/A'}
              </p>
              <p>
                <strong>남은 일수:</strong> {subscription.remaining_days}일
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <SubscriptionProvider>
      <SubscriptionContent />
    </SubscriptionProvider>
  );
}
