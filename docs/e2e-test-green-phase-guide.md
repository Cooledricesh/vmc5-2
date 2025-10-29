# E2E 테스트 GREEN Phase 구현 가이드

## 개요

RED Phase에서 작성된 테스트를 통과시키기 위한 최소 구현 가이드입니다.

## 우선순위별 구현 계획

### Phase 1: 인증 시스템 안정화 (최우선)

#### 1.1 Clerk 테스트 설정

**파일: `tests-e2e/playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false, // 인증 테스트는 순차 실행
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Clerk 세션 쿠키 저장
    storageState: 'tests-e2e/.auth/user.json',
  },
  projects: [
    // 인증 설정 프로젝트
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // 실제 테스트 프로젝트
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
```

#### 1.2 인증 설정 스크립트 생성

**파일: `tests-e2e/auth.setup.ts`**
```typescript
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // 방법 1: Clerk 테스트 모드 사용
  await page.goto('/sign-in');

  // Clerk의 테스트 계정으로 로그인
  // 주의: Clerk Dashboard에서 테스트 모드 활성화 필요
  await page.fill('input[name="identifier"]', process.env.TEST_EMAIL!);
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD!);
  await page.click('button[type="submit"]');

  // 대시보드로 리다이렉트 대기
  await page.waitForURL('**/dashboard');

  // 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
```

#### 1.3 개발 환경 전용 테스트 인증 API

**파일: `src/app/api/test/auth/login/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 개발 환경 전용 테스트 로그인 API
 *
 * 주의: 프로덕션에서는 절대 사용 불가
 */
export async function POST(req: NextRequest) {
  // 프로덕션 환경에서는 차단
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { email } = await req.json();

    // Clerk의 테스트 사용자로 세션 생성
    // 실제 구현은 Clerk API를 사용하여 테스트 토큰 발급

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
```

### Phase 2: 페이지 구조 개선

#### 2.1 대시보드 페이지 개선

**파일: `src/app/dashboard/page.tsx`**
```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default async function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* 테스트 식별을 위한 제목 추가 */}
      <h1 className="text-3xl font-bold mb-6">대시보드</h1>

      {/* 사용자 정보 섹션 */}
      <div data-testid="user-profile" className="mb-8">
        <p data-testid="user-email">{user?.emailAddresses[0]?.emailAddress}</p>
      </div>

      {/* 구독 정보 */}
      <div data-testid="subscription-info" className="mb-8">
        <span data-testid="subscription-badge">무료</span>
        <span data-testid="remaining-count">3 / 3</span>
      </div>

      {/* 새 분석하기 버튼 */}
      <Link href="/new-analysis">
        <button className="btn-primary">
          새 분석하기
        </button>
      </Link>

      {/* 분석 이력 */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">내 분석 이력</h2>
        {/* 분석 카드 목록 */}
      </div>
    </div>
  );
}
```

#### 2.2 새 분석 페이지 구현

**파일: `src/app/new-analysis/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const analysisSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  birthDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return parsed < new Date();
  }, '생년월일은 과거 날짜여야 합니다'),
  birthTime: z.string().optional(),
  gender: z.enum(['male', 'female'], {
    required_error: '성별을 선택해주세요',
  }),
});

type AnalysisFormData = z.infer<typeof analysisSchema>;

export default function NewAnalysisPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
  });

  const onSubmit = async (data: AnalysisFormData) => {
    setIsLoading(true);

    try {
      // API 호출
      const response = await fetch('/api/analysis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.analysisId) {
        router.push(`/analysis/${result.analysisId}`);
      }
    } catch (error) {
      console.error('Failed to create analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">새 사주 분석하기</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* 성함 */}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2">
            성함 *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full border p-2"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* 생년월일 */}
        <div className="mb-4">
          <label htmlFor="birthDate" className="block mb-2">
            생년월일 *
          </label>
          <input
            id="birthDate"
            type="date"
            {...register('birthDate')}
            className="w-full border p-2"
          />
          {errors.birthDate && (
            <p className="text-red-500 text-sm mt-1" role="alert">
              {errors.birthDate.message}
            </p>
          )}
        </div>

        {/* 출생시간 */}
        <div className="mb-4">
          <label htmlFor="birthTime" className="block mb-2">
            출생시간 (선택)
          </label>
          <input
            id="birthTime"
            type="time"
            {...register('birthTime')}
            className="w-full border p-2"
          />
        </div>

        {/* 성별 */}
        <div className="mb-4">
          <label className="block mb-2">성별 *</label>
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                value="male"
                {...register('gender')}
                className="mr-2"
              />
              남
            </label>
            <label>
              <input
                type="radio"
                value="female"
                {...register('gender')}
                className="mr-2"
              />
              여
            </label>
          </div>
          {errors.gender && (
            <p className="text-red-500 text-sm mt-1" role="alert">
              {errors.gender.message}
            </p>
          )}
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? '분석 중...' : '분석 시작'}
        </button>
      </form>

      {isLoading && (
        <div data-testid="loading" className="mt-4 text-center">
          <p>분석을 처리하고 있습니다...</p>
        </div>
      )}
    </div>
  );
}
```

#### 2.3 분석 상세 페이지 구현

**파일: `src/app/analysis/[id]/page.tsx`**
```typescript
'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';

interface AnalysisResult {
  id: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  gender: string;
  status: 'processing' | 'completed' | 'failed';
  result?: string;
}

export default function AnalysisDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/analysis/${params.id}`);

        if (response.status === 404) {
          notFound();
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();

    // 분석 중인 경우 폴링
    const interval = setInterval(() => {
      if (analysis?.status === 'processing') {
        fetchAnalysis();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [params.id, analysis?.status]);

  if (isLoading) {
    return (
      <div data-testid="loading" className="container mx-auto p-4">
        <p>분석 결과를 불러오는 중...</p>
      </div>
    );
  }

  if (!analysis) {
    return notFound();
  }

  if (analysis.status === 'processing') {
    return (
      <div data-testid="loading" className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">분석 처리 중</h1>
        <p>분석을 처리하고 있습니다. 잠시만 기다려주세요...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">사주 분석 결과</h1>

      {/* 기본 정보 */}
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <p>
          <strong>성함:</strong> {analysis.name}
        </p>
        <p>
          <strong>생년월일:</strong> {analysis.birthDate}
        </p>
        {analysis.birthTime && (
          <p>
            <strong>출생시간:</strong> {analysis.birthTime}
          </p>
        )}
        <p>
          <strong>성별:</strong> {analysis.gender === 'male' ? '남' : '여'}
        </p>
      </div>

      {/* 분석 결과 */}
      <div data-testid="analysis-result" className="analysis-content">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">천간지지</h2>
          <p>사주 천간지지 정보...</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">오행 분포</h2>
          <p>목화토금수 오행 분석...</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">종합 해석</h2>
          <div>
            <h3 className="text-xl font-medium mb-2">성격</h3>
            <p>성격 분석 내용...</p>

            <h3 className="text-xl font-medium mb-2 mt-4">재운</h3>
            <p>재운 분석 내용...</p>

            <h3 className="text-xl font-medium mb-2 mt-4">건강운</h3>
            <p>건강운 분석 내용...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 404 페이지
function NotFoundPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">404 - 찾을 수 없습니다</h1>
      <p>요청하신 분석 결과를 찾을 수 없습니다.</p>
    </div>
  );
}
```

### Phase 3: 권한 및 에러 처리

#### 3.1 인증 미들웨어 강화

**파일: `middleware.ts`**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 공개 라우트 정의
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

// 보호된 라우트 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/new-analysis(.*)',
  '/analysis/(.*)',
  '/subscription(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // 보호된 라우트 접근 시 인증 확인
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

## 테스트 실행 및 검증

### 1단계: 인증 설정 테스트
```bash
npm run test:e2e -- auth.setup.ts
```

### 2단계: 로그인 플로우 테스트
```bash
npm run test:e2e -- core-user-flow.spec.ts -g "로그인 플로우"
```

### 3단계: 전체 테스트 실행
```bash
npm run test:e2e -- core-user-flow.spec.ts
```

## 체크리스트

### 인증 시스템
- [ ] Clerk 테스트 모드 설정
- [ ] 인증 설정 스크립트 작성
- [ ] 세션 상태 저장/복원

### 페이지 구현
- [ ] 대시보드 페이지 기본 구조
- [ ] 새 분석 페이지 폼 구현
- [ ] 분석 상세 페이지 구현

### 권한 및 에러 처리
- [ ] 미들웨어 인증 체크
- [ ] 404 에러 페이지
- [ ] 권한 없는 접근 리다이렉트

### 테스트 통과
- [ ] 로그인 플로우 (3개)
- [ ] 분석 의뢰 플로우 (3개)
- [ ] 분석 결과 확인 (3개)
- [ ] 엣지케이스 (3개)

## 다음 단계

GREEN Phase 완료 후:
1. **REFACTOR Phase**: 코드 품질 개선
2. **통합 테스트**: 실제 API 연동
3. **성능 최적화**: 테스트 실행 속도 개선
4. **CI/CD 통합**: 자동화된 테스트 파이프라인
