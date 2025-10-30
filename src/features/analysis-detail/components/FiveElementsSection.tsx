'use client';

import React, { useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadarChart } from '@/components/charts/RadarChart';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';
import { createFiveElementsChartData } from '../lib/utils';

export const FiveElementsSection = React.memo(function FiveElementsSection() {
  const { data } = useAnalysisData();
  const { state, actions } = useAnalysisDetailContext();

  const chartData = useMemo(() => {
    if (!data || !data.analysis_result || !data.analysis_result.five_elements) return [];
    const fiveElements = data.analysis_result.five_elements;
    // 0도 유효한 값이므로 undefined/null 체크만 수행
    if (
      fiveElements.wood_score === undefined ||
      fiveElements.fire_score === undefined ||
      fiveElements.earth_score === undefined ||
      fiveElements.metal_score === undefined ||
      fiveElements.water_score === undefined
    ) return [];
    return createFiveElementsChartData({
      wood: fiveElements.wood_score,
      fire: fiveElements.fire_score,
      earth: fiveElements.earth_score,
      metal: fiveElements.metal_score,
      water: fiveElements.water_score,
    });
  }, [data]);

  // RadarChart에 전달할 데이터를 useMemo로 안정화
  const radarChartData = useMemo(() => {
    return chartData.map(item => ({
      subject: item.subject,
      value: item.value,
      fullMark: item.fullMark
    }));
  }, [chartData]);

  useEffect(() => {
    // 차트 데이터가 준비되면 로딩 상태 해제
    if (chartData.length > 0) {
      const timer = setTimeout(() => {
        actions.setChartLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chartData.length, actions.setChartLoading]);

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
            <RadarChart data={radarChartData} />
            <div className="mt-6 grid grid-cols-5 gap-2">
              {chartData.map((item) => (
                <div key={item.subject} className="text-center">
                  <div
                    className="w-full h-2 rounded mb-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-sm font-medium">{item.subject}</p>
                  <p className="text-xs text-gray-500">{item.value}%</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
