'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/lib/utils/markdown';
import { useActiveTab } from '../hooks/useActiveTab';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { INTERPRETATION_TABS } from '../lib/constants';

export function InterpretationTabs() {
  const { activeTab, setActiveTab } = useActiveTab();
  const { data } = useAnalysisData();

  if (!data || !data.analysis_result) return null;

  const { interpretation } = data.analysis_result;

  // 탭별 컨텐츠 매핑
  const getContent = () => {
    if (!interpretation) return '정보 없음';

    switch (activeTab) {
      case 'personality':
        return interpretation.personality || '정보 없음';

      case 'wealth':
        return interpretation.wealth || '정보 없음';

      case 'health':
        return interpretation.health || '정보 없음';

      case 'love':
        return interpretation.love || '정보 없음';

      default:
        return '정보 없음';
    }
  };

  const currentContent = getContent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>종합 해석</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 탭 버튼 */}
        <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
          {INTERPRETATION_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              size="sm"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* 마크다운 컨텐츠 */}
        <div className="prose prose-gray max-w-none">
          <MarkdownRenderer content={currentContent} />
        </div>
      </CardContent>
    </Card>
  );
}
