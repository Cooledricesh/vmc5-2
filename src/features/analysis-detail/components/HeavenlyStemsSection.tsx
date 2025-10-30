'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { convertToKorean } from '../lib/utils';

export function HeavenlyStemsSection() {
  const { data } = useAnalysisData();

  if (!data || !data.analysis_result) return null;

  const { heavenly_stems } = data.analysis_result;

  if (!heavenly_stems) return null;

  const pillars = [
    {
      label: '년주',
      value: heavenly_stems.year || '미상'
    },
    {
      label: '월주',
      value: heavenly_stems.month || '미상'
    },
    {
      label: '일주',
      value: heavenly_stems.day || '미상'
    },
    {
      label: '시주',
      value: heavenly_stems.hour || '미상'
    },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>천간지지 (사주팔자)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.label}
              className="flex flex-col items-center justify-center p-4 border rounded-lg bg-gradient-to-b from-gray-50 to-white"
            >
              <p className="text-sm text-gray-500 mb-2">{pillar.label}</p>
              <p className="text-2xl font-bold text-gray-900">{pillar.value}</p>
              {pillar.value !== '미상' && (
                <p className="text-xs text-gray-400 mt-1">({convertToKorean(pillar.value)})</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
