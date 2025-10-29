'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { AnalysisItem } from '../lib/dto';
import { formatRelativeTime, formatDate, calculateAge } from '@/lib/utils/date';
import { STATUS_LABELS, AI_MODEL_LABELS, GENDER_LABELS } from '../lib/constants';

type AnalysisCardProps = {
  analysis: AnalysisItem;
};

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const age = calculateAge(analysis.birth_date);
  const statusIcon = {
    processing: <Loader2 className="h-4 w-4 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4" />,
    failed: <XCircle className="h-4 w-4" />,
  }[analysis.status];

  const statusVariant = {
    processing: 'secondary' as const,
    completed: 'default' as const,
    failed: 'destructive' as const,
  }[analysis.status];

  const modelLabel = AI_MODEL_LABELS[analysis.ai_model as keyof typeof AI_MODEL_LABELS] || analysis.ai_model;
  const genderLabel = GENDER_LABELS[analysis.gender];

  const content = (
    <Card className={analysis.status === 'completed' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} data-testid="analysis-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{analysis.subject_name}</CardTitle>
            <Badge variant={statusVariant} className="flex items-center gap-1">
              {statusIcon}
              {STATUS_LABELS[analysis.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>생년월일</span>
              <span>{formatDate(analysis.birth_date)} ({age}세)</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>성별</span>
              <span>{genderLabel}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>AI 모델</span>
              <span>{modelLabel}</span>
            </div>
            <div className="flex justify-between text-muted-foreground pt-2 border-t">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {analysis.view_count}회 조회
              </span>
              <span>{formatRelativeTime(analysis.created_at)}</span>
            </div>
          </div>
        </CardContent>
    </Card>
  );

  if (analysis.status === 'completed') {
    return <Link href={`/analysis/${analysis.id}`}>{content}</Link>;
  }

  return content;
}
