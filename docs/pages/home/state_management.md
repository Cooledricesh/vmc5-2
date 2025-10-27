# 홈(랜딩페이지) 상태 관리 설계 (Level 1)

## 1. 상태 복잡도 평가

홈(랜딩페이지)는 **Level 1: 상태 관리 불필요** 페이지입니다.

### 1.1 상태 관리가 불필요한 이유

홈(랜딩페이지)는 다음과 같은 특징을 가지고 있어 별도의 복잡한 상태 관리가 필요하지 않습니다:

1. **정적 콘텐츠 중심**: 대부분의 콘텐츠가 정적 데이터 (`constants.ts`)
2. **서버 상태 없음**: API 호출 없음, 데이터베이스 조회 없음
3. **단순한 UI 상태**: 애니메이션 상태는 Framer Motion과 `useScrollAnimation` 훅으로 처리
4. **외부 의존성 최소**: Clerk SDK의 `useAuth()` 훅만 사용 (인증 상태만 확인)
5. **컴포넌트 간 상태 공유 없음**: 각 섹션이 독립적으로 동작

### 1.2 Level 분류 기준

- **Level 1 (불필요)**: 정적 콘텐츠, 간단한 UI 상태만 존재
  - ✅ **홈(랜딩페이지)**
- **Level 2 (컴포넌트 상태)**: 폼, 검증, 간단한 서버 상태
  - 예: 로그인 페이지
- **Level 3 (복잡한 상태)**: 여러 상태가 상호작용, 비동기 처리 다수
  - 예: 대시보드, 새 분석하기, 구독 관리

---

## 2. 상태 정의

홈(랜딩페이지)에서 관리해야 할 상태는 다음과 같습니다:

### 2.1 관리해야 할 상태 데이터

#### 2.1.1 인증 상태 (AuthState)
```typescript
type AuthState = {
  isSignedIn: boolean;
  isLoaded: boolean;
};
```

**역할**: 사용자의 로그인 상태에 따라 CTA 버튼 변경
**관리 방법**: Clerk SDK의 `useAuth()` 훅 (외부 상태)
**사용 컴포넌트**:
- `HomeNavbar`: "로그인" / "회원가입" vs "대시보드" 버튼
- `HeroSection`: "무료로 시작하기" / "로그인" vs "분석 시작하기" 버튼
- `CTASection`: "무료로 시작하기" vs "분석 시작하기" 버튼

#### 2.1.2 스크롤 애니메이션 상태 (ScrollAnimationState)
```typescript
type ScrollAnimationState = {
  isVisible: boolean;
};
```

**역할**: Intersection Observer로 섹션이 뷰포트에 들어왔는지 추적
**관리 방법**: `useScrollAnimation()` 훅 (커스텀 훅)
**사용 컴포넌트**:
- `FeaturesSection`
- `PricingSection`
- `TestimonialsSection`
- `StatsSection`
- `FAQSection`
- `CTASection`

### 2.2 상태가 아닌 화면 데이터

다음은 화면에 보이지만 별도 상태 관리가 필요하지 않은 데이터입니다:

1. **섹션 콘텐츠** (타이틀, 설명, 이미지 등)
   - `constants.ts`에 정의된 정적 데이터
   - 컴포넌트에서 직접 import하여 사용

2. **아이콘**
   - `lucide-react`에서 필요한 아이콘만 import
   - 동적 로딩 불필요 (번들 크기 최소화를 위해 Tree-shaking)

3. **URL 해시** (/#features, /#pricing 등)
   - 브라우저 기본 동작 (앵커 스크롤)
   - JavaScript 상태 관리 불필요

4. **애니메이션 진행 상태**
   - Framer Motion이 내부적으로 관리
   - `initial`, `animate`, `transition` props로만 제어

---

## 3. 상태 관리 전략

### 3.1 인증 상태 (Clerk SDK)

**사용 방법**:
```typescript
import { useAuth } from '@clerk/nextjs';

export function HeroSection() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <section>
      {isSignedIn ? (
        <Button asChild>
          <Link href="/analysis/new">분석 시작하기</Link>
        </Button>
      ) : (
        <>
          <Button asChild>
            <Link href="/sign-up">무료로 시작하기</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in">로그인</Link>
          </Button>
        </>
      )}
    </section>
  );
}
```

**장점**:
- Clerk SDK가 인증 상태를 자동으로 관리
- SSR 지원 (서버에서도 인증 상태 확인 가능)
- 별도 Context나 Redux 불필요

**주의사항**:
- `isLoaded`가 `true`일 때까지 기다려야 함 (초기 로딩 상태)
- `useAuth()` 훅은 클라이언트 컴포넌트에서만 사용 가능 (`'use client'` 필수)

---

### 3.2 스크롤 애니메이션 상태 (useScrollAnimation 훅)

**커스텀 훅 구현**:
```typescript
// src/hooks/useScrollAnimation.ts
import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number; // 0.0 ~ 1.0 (뷰포트 진입 기준)
  triggerOnce?: boolean; // 한 번만 트리거할지 여부
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.2, triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce && ref.current) {
            observer.unobserve(ref.current); // 한 번만 트리거
          }
        } else if (!triggerOnce) {
          setIsVisible(false); // 반복 트리거
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, triggerOnce]);

  return { ref, isVisible };
}
```

**사용 방법**:
```typescript
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function FeaturesSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2>주요 기능</h2>
      </motion.div>
    </section>
  );
}
```

**장점**:
- Intersection Observer API를 추상화
- 재사용 가능한 커스텀 훅
- 각 섹션이 독립적으로 애니메이션 상태 관리

**주의사항**:
- `triggerOnce: true`가 기본값 (성능 최적화)
- 구형 브라우저에서는 Polyfill 없이 애니메이션 스킵

---

### 3.3 정적 데이터 관리 (constants.ts)

**정적 데이터 구조**:
```typescript
// src/features/home/lib/constants.ts

export const FEATURES: Feature[] = [
  {
    id: 'ai-analysis',
    icon: 'Sparkles',
    title: 'AI 기반 정확한 분석',
    description: 'Google Gemini AI를 활용해 전통 사주팔자를 과학적으로 분석합니다.',
  },
  // ...
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '무료 체험',
    price: 0,
    currency: '원',
    period: '월',
    description: '서비스를 처음 경험해보세요',
    features: [
      '회원가입 시 3회 무료 분석',
      '기본 AI 모델 (gemini-2.0-flash)',
      // ...
    ],
  },
  // ...
];

// TESTIMONIALS, FAQS, STATS 등 동일 패턴
```

**사용 방법**:
```typescript
import { FEATURES } from '../lib/constants';
import * as Icons from 'lucide-react';

export function FeaturesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {FEATURES.map((feature) => {
        const Icon = (Icons as any)[feature.icon];

        return (
          <Card key={feature.id}>
            <Icon className="w-6 h-6" />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </Card>
        );
      })}
    </div>
  );
}
```

**장점**:
- 하드코딩 방지
- 콘텐츠 수정 시 한 곳에서만 변경
- TypeScript로 타입 안전성 보장

**주의사항**:
- 아이콘은 문자열로 저장하고 동적으로 import (`Icons[feature.icon]`)
- 미래에 CMS 연동 시 DB로 쉽게 전환 가능

---

## 4. 컴포넌트별 상태 사용

### 4.1 HomeNavbar
- **사용 상태**: `useAuth()` 훅의 `isSignedIn`
- **상태 변화**: Clerk 세션 변경 시 자동 리렌더링
- **데이터 흐름**:
  ```
  Clerk SDK → useAuth() → isSignedIn → 조건부 렌더링
  ```

### 4.2 HeroSection
- **사용 상태**: `useAuth()` 훅의 `isSignedIn`
- **상태 변화**: Clerk 세션 변경 시 자동 리렌더링
- **애니메이션**: Framer Motion의 `initial` / `animate` props (내부 상태)
- **데이터 흐름**:
  ```
  Clerk SDK → useAuth() → isSignedIn → CTA 버튼 변경
  Framer Motion → 페이지 로드 시 순차 애니메이션
  ```

### 4.3 FeaturesSection, PricingSection, TestimonialsSection, StatsSection, FAQSection, CTASection
- **사용 상태**: `useScrollAnimation()` 훅의 `isVisible`
- **상태 변화**: Intersection Observer가 섹션 진입 감지 시
- **데이터 흐름**:
  ```
  Intersection Observer → useScrollAnimation() → isVisible → Framer Motion 애니메이션 트리거
  ```

---

## 5. 상태 흐름 시각화

### 5.1 인증 상태 흐름

```
┌─────────────────────────────────────────────────────┐
│              Clerk SDK (External State)             │
│  - isSignedIn: boolean                              │
│  - isLoaded: boolean                                │
└─────────────────────────────────────────────────────┘
                          │
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌───────────────┐                   ┌───────────────┐
│  HomeNavbar   │                   │  HeroSection  │
│  - useAuth()  │                   │  - useAuth()  │
└───────────────┘                   └───────────────┘
        │                                   │
        ↓                                   ↓
  조건부 렌더링                        조건부 렌더링
  - "로그인" / "대시보드"              - "무료로 시작" / "분석 시작"
```

### 5.2 스크롤 애니메이션 흐름

```
┌─────────────────────────────────────────────────────┐
│        Intersection Observer (Browser API)          │
│  - threshold: 0.2                                   │
│  - triggerOnce: true                                │
└─────────────────────────────────────────────────────┘
                          │
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌───────────────────┐             ┌───────────────────┐
│ useScrollAnimation│             │ useScrollAnimation│
│  (FeaturesSection)│             │ (PricingSection)  │
└───────────────────┘             └───────────────────┘
        │                                   │
        ↓                                   ↓
  isVisible: true                     isVisible: true
        │                                   │
        ↓                                   ↓
┌───────────────────┐             ┌───────────────────┐
│ Framer Motion     │             │ Framer Motion     │
│ - opacity: 0 → 1  │             │ - opacity: 0 → 1  │
│ - y: 20 → 0       │             │ - y: 20 → 0       │
└───────────────────┘             └───────────────────┘
```

---

## 6. 성능 최적화

### 6.1 불필요한 리렌더링 방지

**문제점**: 모든 섹션이 `useAuth()`를 호출하면 Clerk 상태 변경 시 전체 리렌더링

**해결책**: `useAuth()`는 최소한의 컴포넌트에서만 사용
- `HomeNavbar` (1개)
- `HeroSection` (1개)
- `CTASection` (1개)

**기타 섹션**: `useAuth()` 사용 안 함 → Clerk 상태 변경 시 리렌더링 안 됨

---

### 6.2 Intersection Observer 성능

**최적화 포인트**:
1. `triggerOnce: true`로 한 번만 관찰 (기본값)
2. `threshold: 0.2`로 20% 진입 시 트리거 (너무 일찍 트리거 방지)
3. 컴포넌트 unmount 시 `observer.unobserve()` 호출 (메모리 누수 방지)

---

### 6.3 Framer Motion 최적화

**최적화 포인트**:
1. `transform`과 `opacity`만 사용 (GPU 가속)
2. `will-change` 속성 자동 적용 (Framer Motion 내부)
3. 애니메이션 duration 0.6초 이하 (빠른 반응)
4. 필요한 기능만 import (Tree-shaking)

```typescript
// ❌ 나쁜 예: 모든 기능 import
import * as Motion from 'framer-motion';

// ✅ 좋은 예: 필요한 것만 import
import { motion } from 'framer-motion';
```

---

### 6.4 정적 데이터 메모이제이션

**불필요**: 정적 데이터는 이미 상수로 정의되어 있으므로 `useMemo` 불필요

```typescript
// ❌ 불필요한 메모이제이션
const features = useMemo(() => FEATURES, []);

// ✅ 직접 사용
const features = FEATURES;
```

---

## 7. 에러 처리

### 7.1 Clerk SDK 로딩 실패
```typescript
export function HeroSection() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // 정상 렌더링
}
```

### 7.2 Intersection Observer 미지원
```typescript
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.2, triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intersection Observer가 지원되지 않으면 즉시 표시
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    // 정상 로직
    const observer = new IntersectionObserver(/* ... */);
    // ...
  }, [threshold, triggerOnce]);

  return { ref, isVisible };
}
```

---

## 8. 테스트 전략

### 8.1 useScrollAnimation 훅 테스트
```typescript
import { renderHook, act } from '@testing-library/react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

describe('useScrollAnimation', () => {
  it('should trigger animation when element enters viewport', () => {
    const { result } = renderHook(() => useScrollAnimation());

    expect(result.current.isVisible).toBe(false);

    // Simulate IntersectionObserver
    act(() => {
      const callback = (IntersectionObserver as any).mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('should not trigger again when triggerOnce is true', () => {
    const { result } = renderHook(() => useScrollAnimation({ triggerOnce: true }));

    // First trigger
    act(() => {
      const callback = (IntersectionObserver as any).mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    expect(result.current.isVisible).toBe(true);

    // Second trigger (should be ignored)
    act(() => {
      const callback = (IntersectionObserver as any).mock.calls[0][0];
      callback([{ isIntersecting: false }]);
    });

    expect(result.current.isVisible).toBe(true); // Still true
  });
});
```

### 8.2 컴포넌트 렌더링 테스트
```typescript
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/features/home/components/HeroSection';

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

describe('HeroSection', () => {
  it('should show sign up button when user is not signed in', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
    });

    render(<HeroSection />);

    expect(screen.getByText('무료로 시작하기')).toBeInTheDocument();
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });

  it('should show analysis button when user is signed in', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
    });

    render(<HeroSection />);

    expect(screen.getByText('분석 시작하기')).toBeInTheDocument();
    expect(screen.queryByText('무료로 시작하기')).not.toBeInTheDocument();
  });
});
```

---

## 9. 결론

홈(랜딩페이지)는 **Level 1: 상태 관리 불필요** 페이지로, 다음과 같은 간단한 상태 관리 전략을 사용합니다:

### 9.1 핵심 설계 원칙
1. **최소한의 상태**: Clerk 인증 상태와 스크롤 애니메이션 상태만 관리
2. **외부 상태 위임**: Clerk SDK가 인증 상태 자동 관리
3. **커스텀 훅 재사용**: `useScrollAnimation` 훅으로 섹션별 애니메이션 독립 관리
4. **정적 데이터 분리**: `constants.ts`로 콘텐츠 중앙 관리

### 9.2 구현 시 주의사항
- Context나 Redux 같은 복잡한 상태 관리 라이브러리 불필요
- 각 컴포넌트가 독립적으로 동작 (높은 응집도, 낮은 결합도)
- 성능 최적화를 위해 `useAuth()` 사용 최소화
- Intersection Observer 미지원 브라우저 대응 (Fallback)

### 9.3 확장 가능성
- 미래에 동적 콘텐츠 (DB 연동) 추가 시 React Query 도입 고려
- A/B 테스팅 추가 시 Feature Flag 상태 관리 추가 가능
- 다국어 지원 시 i18n 상태 추가 가능

이 설계를 따르면 간결하고 유지보수하기 쉬운 홈(랜딩페이지)를 구현할 수 있습니다.
