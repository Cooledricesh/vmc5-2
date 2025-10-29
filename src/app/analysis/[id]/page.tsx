'use client';

import { use } from 'react';
import { AnalysisDetailProvider } from '@/features/analysis-detail/context/AnalysisDetailContext';
import { AnalysisDetailHeader } from '@/features/analysis-detail/components/AnalysisDetailHeader';
import { BasicInfoSection } from '@/features/analysis-detail/components/BasicInfoSection';
import { HeavenlyStemsSection } from '@/features/analysis-detail/components/HeavenlyStemsSection';
import { FiveElementsSection } from '@/features/analysis-detail/components/FiveElementsSection';
import { FortuneFlowSection } from '@/features/analysis-detail/components/FortuneFlowSection';
import { InterpretationTabs } from '@/features/analysis-detail/components/InterpretationTabs';
import { ReanalyzeModal } from '@/features/analysis-detail/components/ReanalyzeModal';
import { DeleteModal } from '@/features/analysis-detail/components/DeleteModal';
import { AnalysisDetailSkeleton } from '@/features/analysis-detail/components/AnalysisDetailSkeleton';
import { AnalysisErrorState } from '@/features/analysis-detail/components/AnalysisErrorState';
import { useAnalysisData } from '@/features/analysis-detail/hooks/useAnalysisData';

function AnalysisDetailContent() {
  const analysis = useAnalysisData();

  if (analysis.isLoading) {
    return <div data-testid="loading"><AnalysisDetailSkeleton /></div>;
  }

  if (analysis.error) {
    return <AnalysisErrorState error={analysis.error} />;
  }

  if (!analysis.data || !analysis.data.analysis_result) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">분석 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl" data-testid="analysis-result">
      <AnalysisDetailHeader />
      <BasicInfoSection />
      <HeavenlyStemsSection />
      <FiveElementsSection />
      <FortuneFlowSection />
      <InterpretationTabs />
      <ReanalyzeModal />
      <DeleteModal />
    </div>
  );
}

export default function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AnalysisDetailProvider analysisId={id}>
      <AnalysisDetailContent />
    </AnalysisDetailProvider>
  );
}
