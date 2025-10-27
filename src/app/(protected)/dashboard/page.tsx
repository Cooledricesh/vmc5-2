'use client';

import { DashboardProvider } from '@/features/dashboard/context/DashboardContext';
import { DashboardSummarySection } from '@/features/dashboard/components/DashboardSummarySection';
import { DashboardStatsCards } from '@/features/dashboard/components/DashboardStatsCards';
import { AnalysisListSection } from '@/features/dashboard/components/AnalysisListSection';

type DashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function DashboardPage({ params }: DashboardPageProps) {
  void params;

  return (
    <DashboardProvider>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 사용자 정보 및 구독 상태 */}
        <DashboardSummarySection />

        {/* 통계 카드 */}
        <DashboardStatsCards />

        {/* 분석 이력 목록 */}
        <AnalysisListSection />
      </div>
    </DashboardProvider>
  );
}
