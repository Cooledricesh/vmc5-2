'use client';

import { useDashboardAnalyses } from '../hooks/useDashboardAnalyses';
import { useDashboardContext } from '../context/DashboardContext';
import { FilterBar } from './FilterBar';
import { AnalysisCard } from './AnalysisCard';
import { PaginationControls } from './PaginationControls';
import { EmptyState } from './EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AnalysisListSection() {
  const { analyses, isLoading, error } = useDashboardAnalyses();
  const { computed } = useDashboardContext();

  if (isLoading) {
    return (
      <div>
        <FilterBar />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <FilterBar />
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (computed.isEmpty) {
    return (
      <div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div>
      <FilterBar />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyses.map((analysis) => (
          <AnalysisCard key={analysis.id} analysis={analysis} />
        ))}
      </div>
      <PaginationControls />
    </div>
  );
}
