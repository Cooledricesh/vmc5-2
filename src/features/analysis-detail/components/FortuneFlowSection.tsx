'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAnalysisData } from '../hooks/useAnalysisData';

export function FortuneFlowSection() {
  const { data } = useAnalysisData();

  if (!data || !data.analysis_result) return null;

  const { fortune_flow } = data.analysis_result;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>운세 흐름</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">대운 (大運)</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{fortune_flow.major_fortune}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">세운 (歲運)</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{fortune_flow.yearly_fortune}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
