'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function AnalysisDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 헤더 스켈레톤 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* 기본 정보 스켈레톤 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* 천간지지 스켈레톤 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 오행 분석 스켈레톤 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>

      {/* 종합 해석 스켈레톤 */}
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
