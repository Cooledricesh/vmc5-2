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

  const { personality, career_wealth, health, relationships } = data.analysis_result;

  // 탭별 컨텐츠 매핑
  const getContent = () => {
    switch (activeTab) {
      case 'personality':
        if (!personality) return '정보 없음';
        return `### 강점\n- ${personality.strengths?.join('\n- ') || '정보 없음'}\n\n### 약점\n- ${personality.weaknesses?.join('\n- ') || '정보 없음'}\n\n### 주요 특징\n${personality.characteristics || '정보 없음'}`;

      case 'wealth':
        if (!career_wealth) return '정보 없음';
        return `### 적합한 직업\n- ${career_wealth.suitable_careers?.join('\n- ') || '정보 없음'}\n\n### 재물운\n${career_wealth.wealth_fortune || '정보 없음'}\n\n### 경력 조언\n${career_wealth.career_advice || '정보 없음'}`;

      case 'health':
        if (!health) return '정보 없음';
        return `### 주의 부위\n${health.vulnerable_areas || '정보 없음'}\n\n### 건강 조언\n${health.health_advice || '정보 없음'}\n\n### 유리한 오행\n${health.favorable_elements || '정보 없음'}`;

      case 'love':
        if (!relationships) return '정보 없음';
        return `### 결혼/연애운\n${relationships.marriage_compatibility || '정보 없음'}\n\n### 잘 맞는 유형\n- ${relationships.compatible_types?.join('\n- ') || '정보 없음'}\n\n### 주의할 유형\n- ${relationships.challenging_types?.join('\n- ') || '정보 없음'}\n\n### 관계 조언\n${relationships.relationship_advice || '정보 없음'}`;

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
