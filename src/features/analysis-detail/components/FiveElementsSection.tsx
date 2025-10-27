'use client';

import { useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadarChart } from '@/components/charts/RadarChart';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';
import { createFiveElementsChartData } from '../lib/utils';

export function FiveElementsSection() {
  const { data } = useAnalysisData();
  const { state, actions } = useAnalysisDetailContext();

  const chartData = useMemo(() => {
    if (!data || !data.analysis_result || !data.analysis_result.five_elements) return [];
    const fiveElements = data.analysis_result.five_elements;
    if (!fiveElements.wood || !fiveElements.fire || !fiveElements.earth || !fiveElements.metal || !fiveElements.water) return [];
    return createFiveElementsChartData(fiveElements as { wood: number; fire: number; earth: number; metal: number; water: number; });
  }, [data]);

  useEffect(() => {
    if (chartData.length > 0) {
      // 차트 데이터가 준비되면 로딩 상태 해제
      setTimeout(() => {
        actions.setChartLoading(false);
      }, 300);
    }
  }, [chartData, actions]);

  if (!data || !data.analysis_result) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>오행 분석</CardTitle>
      </CardHeader>
      <CardContent>
        {state.ui.chartLoading.fiveElements ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        ) : (
          <>
            <RadarChart data={chartData as any} />
            <div className="mt-6 grid grid-cols-5 gap-2">
              {chartData.map((item) => (
                <div key={item.element} className="text-center">
                  <div
                    className="w-full h-2 rounded mb-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-sm font-medium">{item.element}</p>
                  <p className="text-xs text-gray-500">{item.count}개</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
