# Subscription Feature

UC-006: Pro 구독 해지 기능을 포함한 구독 관리 기능

## 디렉토리 구조

```
subscription/
├── components/              # UI 컴포넌트
│   ├── SubscriptionModal.tsx
│   ├── CancelSubscriptionModalContainer.tsx
│   └── PaymentMethodModal.tsx
├── hooks/                  # React Query hooks
│   ├── useCancelSubscription.ts
│   ├── useSubscription.ts
│   └── useTossPayments.ts
├── backend/               # Hono API 라우터 & 서비스
│   ├── route.ts
│   ├── service.ts
│   ├── schema.ts
│   └── error.ts
├── constants/            # 상수 정의
│   ├── query-keys.ts
│   └── messages.ts
└── lib/                 # 유틸리티 및 타입
    ├── dto.ts
    └── types.ts
```

## 주요 기능

### 1. 구독 해지 (UC-006)

사용자가 Pro 구독을 해지할 수 있는 기능입니다.

#### 사용 예시

```tsx
import { CancelSubscriptionModalContainer } from '@/features/subscription/components';

function MyComponent() {
  const [showCancelModal, setShowCancelModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowCancelModal(true)}>
        구독 해지
      </button>

      <CancelSubscriptionModalContainer
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          console.log('구독이 성공적으로 해지되었습니다');
        }}
      />
    </>
  );
}
```

#### Hook 단독 사용

```tsx
import { useCancelSubscription } from '@/features/subscription/hooks';

function MyComponent() {
  const cancelMutation = useCancelSubscription({
    onSuccess: (data) => {
      console.log('Subscription cancelled:', data);
    },
    onError: (error) => {
      console.error('Failed to cancel:', error);
    },
  });

  const handleCancel = () => {
    cancelMutation.mutate({
      cancellation_reason: 'expensive',
      feedback: 'Too expensive for me',
    });
  };

  return (
    <button
      onClick={handleCancel}
      disabled={cancelMutation.isPending}
    >
      {cancelMutation.isPending ? '처리 중...' : '구독 해지'}
    </button>
  );
}
```

## API 엔드포인트

### DELETE `/api/subscription/cancel`

구독을 해지합니다.

**Request Body:**
```typescript
{
  cancellation_reason?: string;  // 해지 사유
  feedback?: string;             // 피드백 (최대 500자)
}
```

**Response:**
```typescript
{
  subscription_id: string;
  subscription_tier: 'free' | 'pro';
  subscription_status: 'pending_cancellation' | 'cancelled';
  effective_until: string;       // 해지 유효일
  // ...
}
```

## 테스트

### 단위 테스트

```bash
# Hook 테스트
npm run test:unit -- src/features/subscription/hooks/__tests__/useCancelSubscription.test.tsx

# 컴포넌트 테스트
npm run test:unit -- src/features/subscription/components/__tests__/SubscriptionModal.test.tsx
```

### 통합 테스트

```bash
npm run test:unit -- src/features/subscription/components/__tests__/CancelSubscriptionModal.integration.test.tsx
```

## TDD 프로세스

이 기능은 완전한 TDD(Test-Driven Development) 방식으로 개발되었습니다:

1. **RED Phase**: 실패하는 테스트 작성
   - `useCancelSubscription.test.tsx` (7 tests)
   - `CancelSubscriptionModal.integration.test.tsx` (7 tests)

2. **GREEN Phase**: 테스트를 통과하는 최소 코드 구현
   - `useCancelSubscription.ts`
   - `CancelSubscriptionModalContainer.tsx`

3. **REFACTOR Phase**: 코드 품질 개선
   - 상수 추출 (`query-keys.ts`, `messages.ts`)
   - 타입 안정성 향상 (`extractErrorMessage` helper)
   - JSDoc 문서 추가

## 상태 관리

- **React Query**: 서버 상태 관리 (구독 정보 캐싱, 자동 갱신)
- **Local State**: 모달 UI 상태 (CancelSubscriptionModal 내부)
- **Query Invalidation**: 구독 해지 성공 시 자동으로 구독 정보 캐시 무효화

## 에러 처리

- API 에러: 백엔드에서 반환하는 에러 메시지 표시
- 네트워크 에러: 일반 에러 메시지 표시
- Toast 알림: 성공/실패 시 사용자에게 피드백 제공

## 주의사항

- 구독 해지 시 즉시 Pro 혜택이 중단되지 않고, 현재 결제 주기가 끝날 때까지 계속 이용 가능
- 해지 사유는 선택 사항이지만 UI에서는 필수로 요구
- 피드백은 최대 500자까지 입력 가능
