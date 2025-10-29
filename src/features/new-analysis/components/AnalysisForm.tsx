'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNewAnalysisContext } from '../context/NewAnalysisContext';

// 폼 스키마 정의
const analysisFormSchema = z.object({
  subject_name: z
    .string()
    .min(2, '이름은 2자 이상이어야 합니다')
    .max(50, '이름은 50자 이하여야 합니다'),
  birth_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return parsed < new Date() && !isNaN(parsed.getTime());
  }, '유효한 생년월일을 입력해주세요'),
  birth_time: z.string().optional(),
  gender: z.enum(['male', 'female'], {
    required_error: '성별을 선택해주세요',
  }),
});

type AnalysisFormData = z.infer<typeof analysisFormSchema>;

export function AnalysisForm() {
  const router = useRouter();
  const { state, dispatch } = useNewAnalysisContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      subject_name: state.formData.subject_name,
      birth_date: state.formData.birth_date,
      birth_time: state.formData.birth_time || '',
      gender: state.formData.gender || undefined,
    },
  });

  const onSubmit = async (data: AnalysisFormData) => {
    setIsSubmitting(true);
    dispatch({ type: 'SUBMIT_ANALYSIS_START' });

    try {
      // API 호출
      const response = await fetch('/api/analyses/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: data.subject_name,
          birth_date: data.birth_date,
          birth_time: data.birth_time || null,
          gender: data.gender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '분석 생성에 실패했습니다');
      }

      const result = await response.json();

      dispatch({
        type: 'SUBMIT_ANALYSIS_SUCCESS',
        payload: {
          analysis_id: result.analysis_id,
          status: result.status || 'processing',
          remaining_count: result.remaining_count || 0,
        },
      });

      // 분석 상세 페이지로 이동
      router.push(`/analysis/${result.analysis_id}`);
    } catch (error) {
      console.error('Failed to create analysis:', error);
      dispatch({
        type: 'SUBMIT_ANALYSIS_FAILURE',
        payload: {
          error: {
            code: 'ANALYSIS_CREATE_ERROR',
            message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
            is_recoverable: true,
          },
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>분석 정보 입력</CardTitle>
        <CardDescription>
          정확한 사주 분석을 위해 아래 정보를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 성함 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              성함 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="예: 홍길동"
              {...register('subject_name')}
              aria-invalid={errors.subject_name ? 'true' : 'false'}
            />
            {errors.subject_name && (
              <p className="text-sm text-destructive" role="alert">
                {errors.subject_name.message}
              </p>
            )}
          </div>

          {/* 생년월일 */}
          <div className="space-y-2">
            <Label htmlFor="birthDate">
              생년월일 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              {...register('birth_date')}
              aria-invalid={errors.birth_date ? 'true' : 'false'}
            />
            {errors.birth_date && (
              <p className="text-sm text-destructive" role="alert">
                {errors.birth_date.message}
              </p>
            )}
          </div>

          {/* 출생시간 */}
          <div className="space-y-2">
            <Label htmlFor="birthTime">
              출생시간 <span className="text-muted-foreground">(선택)</span>
            </Label>
            <Input
              id="birthTime"
              name="birthTime"
              type="time"
              {...register('birth_time')}
              placeholder="출생시간을 아는 경우 입력해주세요"
            />
            <p className="text-sm text-muted-foreground">
              출생시간을 입력하면 더 정확한 분석이 가능합니다
            </p>
          </div>

          {/* 성별 */}
          <div className="space-y-2">
            <Label>
              성별 <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              onValueChange={(value) => setValue('gender', value as 'male' | 'female')}
              defaultValue={watch('gender')}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="font-normal cursor-pointer">
                    남성
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="font-normal cursor-pointer">
                    여성
                  </Label>
                </div>
              </div>
            </RadioGroup>
            {errors.gender && (
              <p className="text-sm text-destructive" role="alert">
                {errors.gender.message}
              </p>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? '분석 중...' : '분석 시작'}
            </Button>
          </div>

          {/* 로딩 상태 */}
          {isSubmitting && (
            <div data-testid="loading" className="text-center text-sm text-muted-foreground">
              <p>AI가 사주를 분석하고 있습니다...</p>
              <p className="mt-1">잠시만 기다려주세요</p>
            </div>
          )}

          {/* 에러 상태 */}
          {state.apiRequest.error && (
            <div className="p-4 border border-destructive bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive">{state.apiRequest.error.message}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
