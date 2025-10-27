'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar } from 'lucide-react';
import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';
import { formatDateKorean } from '@/lib/utils/date';

export function BasicInfoSection() {
  const { state, computed } = useAnalysisDetailContext();
  const { data } = state.analysis;

  if (!data) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>기본 정보</span>
          <Badge variant={data.ai_model === 'gemini-2.0-pro' ? 'default' : 'secondary'}>
            {computed.aiModelBadge}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">성함</p>
            <p className="text-lg font-medium">
              {computed.genderIcon} {data.subject_name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">생년월일</p>
            <p className="text-lg font-medium">{formatDateKorean(data.birth_date)}</p>
          </div>
          {data.birth_time && (
            <div>
              <p className="text-sm text-gray-500">출생시간</p>
              <p className="text-lg font-medium">{data.birth_time}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">성별</p>
            <p className="text-lg font-medium">{data.gender === 'male' ? '남성' : '여성'}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{computed.relativeTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>조회수 {data.view_count}</span>
            </div>
          </div>
          <Badge variant="outline">{data.status === 'completed' ? '완료' : '처리 중'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
