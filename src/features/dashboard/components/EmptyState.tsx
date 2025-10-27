'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">분석 이력이 없습니다</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          첫 사주 분석을 시작하여 당신의 운명을 확인해보세요
        </p>
        <Button asChild>
          <Link href="/analysis/new">새 분석하기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
