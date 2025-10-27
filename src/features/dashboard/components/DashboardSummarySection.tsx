'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { formatDateKorean } from '@/lib/utils/date';

export function DashboardSummarySection() {
  const { user, subscription, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !user) {
    return (
      <Card className="mb-8 border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error || '사용자 정보를 불러올 수 없습니다'}</p>
        </CardContent>
      </Card>
    );
  }

  const tierBadgeVariant = user.subscription_tier === 'pro' ? 'default' : 'secondary';
  const tierLabel = user.subscription_tier === 'pro' ? 'Pro' : '무료 체험';

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{user.name}님, 환영합니다</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
          <Badge variant={tierBadgeVariant} className="text-sm">
            {tierLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">남은 분석 횟수</p>
              <p className="text-2xl font-bold mt-1">{subscription?.remaining_count || 0}회</p>
            </div>
            <Button asChild>
              <Link href="/analysis/new">새 분석하기</Link>
            </Button>
          </div>

          {user.subscription_tier === 'pro' && subscription?.next_payment_date && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                다음 결제일: {formatDateKorean(subscription.next_payment_date)}
              </p>
              {subscription.card_last_4digits && (
                <p className="text-sm text-muted-foreground">
                  결제 카드: **** **** **** {subscription.card_last_4digits}
                </p>
              )}
            </div>
          )}

          {user.subscription_tier === 'free' && subscription?.remaining_count === 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                무료 체험 횟수를 모두 사용했습니다.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/subscription">Pro 구독하기</Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
