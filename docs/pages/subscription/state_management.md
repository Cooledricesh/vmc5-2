# 구독 관리 페이지 상태 관리 설계 (Level 3)

## 복잡도 분석
- **복잡도 점수**: 22점 (Very High)
- **상태 개수**: 8개 (구독 정보, 결제 상태, 약관 동의, 해지 모달, 사유 선택, SDK 상태, 로딩, 에러)
- **상호작용**: 5개 (구독/해지, 재활성화, 카드 변경, 약관, 결제창)
- **컴포넌트 계층**: 4단계 (구독 카드, 결제 폼, 약관 섹션, 해지 모달)
- **데이터 흐름**: 복잡 (토스페이먼츠 SDK, 빌링키, Webhook, 트랜잭션)

## 1. 상태 정의

### 1.1 관리해야 할 상태 데이터

#### (1) 구독 정보 상태 (Subscription State)
```typescript
interface SubscriptionState {
  subscription_id: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_status: 'active' | 'pending_cancellation' | 'cancelled' | null;
  next_payment_date: string | null;  // ISO 8601 format
  effective_until: string | null;     // 해지 시 혜택 종료일
  card_last_4digits: string | null;
  card_type: string | null;           // '신용', '체크'
  price: number;                      // 9900
  auto_renewal: boolean;
  monthly_analysis_count: number;     // Pro: 0~10, Free: N/A
  remaining_days: number | null;      // 해지 예정 시 남은 일수
}
```

#### (2) 결제 프로세스 상태 (Payment Process State)
```typescript
interface PaymentProcessState {
  step: 'idle' | 'terms_agreement' | 'loading_sdk' | 'requesting_billing' | 'processing_payment' | 'completed' | 'failed';
  authKey: string | null;             // 토스페이먼츠에서 받은 authKey
  customerKey: string | null;         // Clerk user_id
  isProcessing: boolean;              // 결제 처리 중 여부
  error: PaymentError | null;
}

interface PaymentError {
  code: string;                       // API 에러 코드
  message: string;                    // 사용자에게 표시할 메시지
}
```

#### (3) 약관 동의 상태 (Terms Agreement State)
```typescript
interface TermsAgreementState {
  termsAccepted: boolean;             // 전자금융거래 이용약관
  privacyAccepted: boolean;           // 개인정보 제3자 제공 동의
  autoPaymentAccepted: boolean;       // 자동결제 동의
  allAccepted: boolean;               // 전체 동의 여부
}
```

#### (4) 해지 모달 상태 (Cancellation Modal State)
```typescript
interface CancellationModalState {
  isOpen: boolean;                    // 모달 표시 여부
  step: 'reason_selection' | 'confirmation' | 'processing' | 'completed';
  cancellation_reason: string | null; // 선택된 해지 사유
  feedback: string;                   // 사용자 피드백 (선택사항)
  isSubmitting: boolean;              // 해지 요청 중
  error: string | null;
}
```

#### (5) 재활성화 모달 상태 (Reactivation Modal State)
```typescript
interface ReactivationModalState {
  isOpen: boolean;
  selectedOption: 'existing_card' | 'new_card' | null;
  isProcessing: boolean;
  error: string | null;
}
```

#### (6) 토스페이먼츠 SDK 상태 (TossPayments SDK State)
```typescript
interface TossPaymentsSDKState {
  isLoaded: boolean;                  // SDK 로드 완료 여부
  isReady: boolean;                   // Payment 인스턴스 생성 완료
  instance: TossPayments | null;      // SDK 인스턴스
  payment: Payment | null;            // Payment 객체
  loadError: string | null;
}
```

#### (7) UI 로딩 상태 (Loading State)
```typescript
interface LoadingState {
  fetchingSubscription: boolean;      // 구독 정보 조회 중
  processingPayment: boolean;         // 결제 처리 중
  cancellingSubscription: boolean;    // 구독 해지 중
  reactivatingSubscription: boolean;  // 구독 재활성화 중
  changingCard: boolean;              // 카드 변경 중
}
```

#### (8) 에러 상태 (Error State)
```typescript
interface ErrorState {
  fetchError: string | null;          // 구독 정보 조회 실패
  paymentError: PaymentError | null;  // 결제 실패
  cancellationError: string | null;   // 해지 실패
  reactivationError: string | null;   // 재활성화 실패
  sdkError: string | null;            // SDK 로딩 실패
}
```

### 1.2 화면에 보여지지만 상태가 아닌 것 (Derived State)

다음 데이터들은 기존 상태로부터 **계산(derived)**되므로 별도 상태로 관리하지 않습니다:

1. **구독 뱃지 텍스트 및 색상**:
   - `subscription_tier`와 `subscription_status`로부터 계산
   - 예: `active` → "Pro 구독 중" (녹색), `pending_cancellation` → "해지 예정" (노란색)

2. **남은 일수 표시**:
   - `effective_until`과 현재 날짜의 차이로 계산
   - `Math.ceil((new Date(effective_until) - new Date()) / (1000 * 60 * 60 * 24))`

3. **버튼 활성화 상태**:
   - "결제하기" 버튼: `allAccepted && !isProcessing`
   - "구독 해지" 버튼: `subscription_status === 'active' && !isProcessing`
   - "재활성화" 버튼: `subscription_status === 'pending_cancellation' && effective_until >= today`

4. **다음 결제 금액 표시**:
   - `price` 값에 천 단위 콤마 추가 (9,900원)

5. **카드 정보 표시**:
   - `card_type`과 `card_last_4digits`를 조합 (예: "신용카드 **** 1234")

6. **분석 가능 횟수 표시**:
   - Pro: `monthly_analysis_count`개 남음
   - Free: 무료 분석 소진 (0회)

## 2. 상태 전환 테이블

### 2.1 구독 신청 프로세스 상태 전환

| 현재 상태 | 이벤트/조건 | 다음 상태 | 화면 변화 |
|---------|-----------|----------|---------|
| `idle` (초기) | "Pro 구독하기" 버튼 클릭 | `terms_agreement` | 약관 동의 모달 표시 |
| `terms_agreement` | 모든 약관 동의 + "결제하기" 클릭 | `loading_sdk` | SDK 로딩 스피너 표시 |
| `loading_sdk` | SDK 로드 완료 | `requesting_billing` | "결제 정보 입력 중..." 메시지 |
| `requesting_billing` | `requestBillingAuth()` 호출 | (토스페이먼츠 결제창으로 리다이렉트) | 페이지 이탈 |
| (결제창 복귀) | successUrl 리다이렉트 + authKey 수신 | `processing_payment` | "결제 처리 중..." 로딩 표시 |
| `processing_payment` | 빌링키 발급 + 초회 결제 성공 | `completed` | 성공 페이지로 이동 |
| `processing_payment` | 결제 실패 (API 에러) | `failed` | 에러 모달 표시 |
| `failed` | "다시 시도" 버튼 클릭 | `idle` | 초기 상태로 복귀 |

### 2.2 구독 해지 프로세스 상태 전환

| 현재 상태 | 이벤트/조건 | 다음 상태 | 화면 변화 |
|---------|-----------|----------|---------|
| 해지 모달 닫힘 | "구독 해지" 버튼 클릭 | `reason_selection` | 해지 모달 오픈, 사유 선택 화면 |
| `reason_selection` | 사유 선택 (선택사항) + "다음" 클릭 | `confirmation` | 최종 확인 화면, 주의사항 표시 |
| `confirmation` | "해지하기" 버튼 클릭 | `processing` | 로딩 스피너, 버튼 비활성화 |
| `processing` | 빌링키 삭제 + DB 업데이트 성공 | `completed` | 성공 메시지, 모달 자동 닫힘 |
| `processing` | 해지 실패 (API 에러) | `reason_selection` (에러 표시) | 에러 메시지 표시, 재시도 가능 |
| `completed` | 모달 닫힘 (자동 or 수동) | 초기 상태 | 구독 정보 새로고침, UI 업데이트 |

### 2.3 구독 상태별 UI 변화

| `subscription_status` | 표시 뱃지 | 주요 버튼 | 안내 메시지 | 기능 제약 |
|---------------------|---------|---------|-----------|---------|
| `null` (무료 회원) | "무료 플랜" | "Pro 구독하기" | "월 10회 프리미엄 분석을 이용하세요" | 무료 분석 0회 |
| `active` (Pro 활성) | "Pro 구독 중" (녹색) | "구독 해지", "결제 정보 변경" | "다음 결제일: YYYY-MM-DD" | Pro 기능 전체 이용 |
| `pending_cancellation` | "해지 예정" (노란색) | "구독 재활성화" | "YYYY-MM-DD까지 Pro 혜택 유지" | Pro 기능 유지 (결제일 전까지) |
| `cancelled` (해지 완료) | "무료 플랜" | "Pro 구독하기" | "구독이 종료되었습니다" | 무료 회원과 동일 |

## 3. Flux 패턴 설계

### 3.1 Action 정의

사용자가 수행할 수 있는 모든 Action을 정의합니다.

#### (1) 구독 정보 조회 Actions
```typescript
type FetchSubscriptionStartAction = {
  type: 'FETCH_SUBSCRIPTION_START';
};

type FetchSubscriptionSuccessAction = {
  type: 'FETCH_SUBSCRIPTION_SUCCESS';
  payload: SubscriptionState;
};

type FetchSubscriptionFailureAction = {
  type: 'FETCH_SUBSCRIPTION_FAILURE';
  payload: { error: string };
};
```

#### (2) 결제 프로세스 Actions
```typescript
type InitiateSubscriptionAction = {
  type: 'INITIATE_SUBSCRIPTION';
};

type UpdateTermsAction = {
  type: 'UPDATE_TERMS';
  payload: {
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    autoPaymentAccepted?: boolean;
  };
};

type LoadSDKStartAction = {
  type: 'LOAD_SDK_START';
};

type LoadSDKSuccessAction = {
  type: 'LOAD_SDK_SUCCESS';
  payload: {
    instance: TossPayments;
    payment: Payment;
  };
};

type LoadSDKFailureAction = {
  type: 'LOAD_SDK_FAILURE';
  payload: { error: string };
};

type RequestBillingAuthStartAction = {
  type: 'REQUEST_BILLING_AUTH_START';
};

type ProcessPaymentStartAction = {
  type: 'PROCESS_PAYMENT_START';
  payload: {
    authKey: string;
    customerKey: string;
  };
};

type ProcessPaymentSuccessAction = {
  type: 'PROCESS_PAYMENT_SUCCESS';
  payload: SubscriptionState;
};

type ProcessPaymentFailureAction = {
  type: 'PROCESS_PAYMENT_FAILURE';
  payload: PaymentError;
};

type ResetPaymentProcessAction = {
  type: 'RESET_PAYMENT_PROCESS';
};
```

#### (3) 구독 해지 Actions
```typescript
type OpenCancellationModalAction = {
  type: 'OPEN_CANCELLATION_MODAL';
};

type CloseCancellationModalAction = {
  type: 'CLOSE_CANCELLATION_MODAL';
};

type SelectCancellationReasonAction = {
  type: 'SELECT_CANCELLATION_REASON';
  payload: {
    reason: string;
    feedback?: string;
  };
};

type ConfirmCancellationAction = {
  type: 'CONFIRM_CANCELLATION';
};

type CancelSubscriptionStartAction = {
  type: 'CANCEL_SUBSCRIPTION_START';
};

type CancelSubscriptionSuccessAction = {
  type: 'CANCEL_SUBSCRIPTION_SUCCESS';
  payload: {
    subscription_status: 'pending_cancellation';
    effective_until: string;
    remaining_days: number;
  };
};

type CancelSubscriptionFailureAction = {
  type: 'CANCEL_SUBSCRIPTION_FAILURE';
  payload: { error: string };
};
```

#### (4) 구독 재활성화 Actions
```typescript
type OpenReactivationModalAction = {
  type: 'OPEN_REACTIVATION_MODAL';
};

type CloseReactivationModalAction = {
  type: 'CLOSE_REACTIVATION_MODAL';
};

type SelectReactivationOptionAction = {
  type: 'SELECT_REACTIVATION_OPTION';
  payload: { option: 'existing_card' | 'new_card' };
};

type ReactivateSubscriptionStartAction = {
  type: 'REACTIVATE_SUBSCRIPTION_START';
};

type ReactivateSubscriptionSuccessAction = {
  type: 'REACTIVATE_SUBSCRIPTION_SUCCESS';
  payload: SubscriptionState;
};

type ReactivateSubscriptionFailureAction = {
  type: 'REACTIVATE_SUBSCRIPTION_FAILURE';
  payload: { error: string };
};
```

#### (5) 결제 정보 변경 Actions
```typescript
type ChangeCardStartAction = {
  type: 'CHANGE_CARD_START';
};

type ChangeCardSuccessAction = {
  type: 'CHANGE_CARD_SUCCESS';
  payload: {
    card_last_4digits: string;
    card_type: string;
  };
};

type ChangeCardFailureAction = {
  type: 'CHANGE_CARD_FAILURE';
  payload: { error: string };
};
```

#### (6) 전체 Action Union Type
```typescript
type SubscriptionAction =
  | FetchSubscriptionStartAction
  | FetchSubscriptionSuccessAction
  | FetchSubscriptionFailureAction
  | InitiateSubscriptionAction
  | UpdateTermsAction
  | LoadSDKStartAction
  | LoadSDKSuccessAction
  | LoadSDKFailureAction
  | RequestBillingAuthStartAction
  | ProcessPaymentStartAction
  | ProcessPaymentSuccessAction
  | ProcessPaymentFailureAction
  | ResetPaymentProcessAction
  | OpenCancellationModalAction
  | CloseCancellationModalAction
  | SelectCancellationReasonAction
  | ConfirmCancellationAction
  | CancelSubscriptionStartAction
  | CancelSubscriptionSuccessAction
  | CancelSubscriptionFailureAction
  | OpenReactivationModalAction
  | CloseReactivationModalAction
  | SelectReactivationOptionAction
  | ReactivateSubscriptionStartAction
  | ReactivateSubscriptionSuccessAction
  | ReactivateSubscriptionFailureAction
  | ChangeCardStartAction
  | ChangeCardSuccessAction
  | ChangeCardFailureAction;
```

### 3.2 Reducer (Store 단계)

useReducer를 사용하여 상태를 업데이트합니다.

```typescript
interface SubscriptionContextState {
  subscription: SubscriptionState;
  paymentProcess: PaymentProcessState;
  termsAgreement: TermsAgreementState;
  cancellationModal: CancellationModalState;
  reactivationModal: ReactivationModalState;
  tossSDK: TossPaymentsSDKState;
  loading: LoadingState;
  errors: ErrorState;
}

const initialState: SubscriptionContextState = {
  subscription: {
    subscription_id: null,
    subscription_tier: 'free',
    subscription_status: null,
    next_payment_date: null,
    effective_until: null,
    card_last_4digits: null,
    card_type: null,
    price: 9900,
    auto_renewal: false,
    monthly_analysis_count: 0,
    remaining_days: null,
  },
  paymentProcess: {
    step: 'idle',
    authKey: null,
    customerKey: null,
    isProcessing: false,
    error: null,
  },
  termsAgreement: {
    termsAccepted: false,
    privacyAccepted: false,
    autoPaymentAccepted: false,
    allAccepted: false,
  },
  cancellationModal: {
    isOpen: false,
    step: 'reason_selection',
    cancellation_reason: null,
    feedback: '',
    isSubmitting: false,
    error: null,
  },
  reactivationModal: {
    isOpen: false,
    selectedOption: null,
    isProcessing: false,
    error: null,
  },
  tossSDK: {
    isLoaded: false,
    isReady: false,
    instance: null,
    payment: null,
    loadError: null,
  },
  loading: {
    fetchingSubscription: false,
    processingPayment: false,
    cancellingSubscription: false,
    reactivatingSubscription: false,
    changingCard: false,
  },
  errors: {
    fetchError: null,
    paymentError: null,
    cancellationError: null,
    reactivationError: null,
    sdkError: null,
  },
};

function subscriptionReducer(
  state: SubscriptionContextState,
  action: SubscriptionAction
): SubscriptionContextState {
  switch (action.type) {
    // 구독 정보 조회
    case 'FETCH_SUBSCRIPTION_START':
      return {
        ...state,
        loading: { ...state.loading, fetchingSubscription: true },
        errors: { ...state.errors, fetchError: null },
      };

    case 'FETCH_SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        loading: { ...state.loading, fetchingSubscription: false },
      };

    case 'FETCH_SUBSCRIPTION_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, fetchingSubscription: false },
        errors: { ...state.errors, fetchError: action.payload.error },
      };

    // 결제 프로세스
    case 'INITIATE_SUBSCRIPTION':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'terms_agreement' },
      };

    case 'UPDATE_TERMS': {
      const newTerms = {
        ...state.termsAgreement,
        ...action.payload,
      };
      const allAccepted = newTerms.termsAccepted && newTerms.privacyAccepted && newTerms.autoPaymentAccepted;
      return {
        ...state,
        termsAgreement: { ...newTerms, allAccepted },
      };
    }

    case 'LOAD_SDK_START':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'loading_sdk' },
        tossSDK: { ...state.tossSDK, isLoaded: false, loadError: null },
      };

    case 'LOAD_SDK_SUCCESS':
      return {
        ...state,
        tossSDK: {
          ...state.tossSDK,
          isLoaded: true,
          isReady: true,
          instance: action.payload.instance,
          payment: action.payload.payment,
        },
      };

    case 'LOAD_SDK_FAILURE':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'failed' },
        tossSDK: { ...state.tossSDK, loadError: action.payload.error },
        errors: { ...state.errors, sdkError: action.payload.error },
      };

    case 'REQUEST_BILLING_AUTH_START':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'requesting_billing' },
      };

    case 'PROCESS_PAYMENT_START':
      return {
        ...state,
        paymentProcess: {
          ...state.paymentProcess,
          step: 'processing_payment',
          authKey: action.payload.authKey,
          customerKey: action.payload.customerKey,
          isProcessing: true,
        },
        loading: { ...state.loading, processingPayment: true },
      };

    case 'PROCESS_PAYMENT_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        paymentProcess: {
          ...state.paymentProcess,
          step: 'completed',
          isProcessing: false,
        },
        loading: { ...state.loading, processingPayment: false },
        termsAgreement: initialState.termsAgreement, // 약관 동의 초기화
      };

    case 'PROCESS_PAYMENT_FAILURE':
      return {
        ...state,
        paymentProcess: {
          ...state.paymentProcess,
          step: 'failed',
          isProcessing: false,
          error: action.payload,
        },
        loading: { ...state.loading, processingPayment: false },
        errors: { ...state.errors, paymentError: action.payload },
      };

    case 'RESET_PAYMENT_PROCESS':
      return {
        ...state,
        paymentProcess: initialState.paymentProcess,
        termsAgreement: initialState.termsAgreement,
        errors: { ...state.errors, paymentError: null, sdkError: null },
      };

    // 구독 해지
    case 'OPEN_CANCELLATION_MODAL':
      return {
        ...state,
        cancellationModal: {
          ...initialState.cancellationModal,
          isOpen: true,
        },
      };

    case 'CLOSE_CANCELLATION_MODAL':
      return {
        ...state,
        cancellationModal: initialState.cancellationModal,
      };

    case 'SELECT_CANCELLATION_REASON':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          cancellation_reason: action.payload.reason,
          feedback: action.payload.feedback || '',
        },
      };

    case 'CONFIRM_CANCELLATION':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'confirmation',
        },
      };

    case 'CANCEL_SUBSCRIPTION_START':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'processing',
          isSubmitting: true,
        },
        loading: { ...state.loading, cancellingSubscription: true },
      };

    case 'CANCEL_SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: {
          ...state.subscription,
          subscription_status: action.payload.subscription_status,
          effective_until: action.payload.effective_until,
          remaining_days: action.payload.remaining_days,
          auto_renewal: false,
        },
        cancellationModal: {
          ...state.cancellationModal,
          step: 'completed',
          isSubmitting: false,
          isOpen: false, // 성공 시 모달 자동 닫기
        },
        loading: { ...state.loading, cancellingSubscription: false },
      };

    case 'CANCEL_SUBSCRIPTION_FAILURE':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'reason_selection', // 에러 시 이전 단계로
          isSubmitting: false,
          error: action.payload.error,
        },
        loading: { ...state.loading, cancellingSubscription: false },
        errors: { ...state.errors, cancellationError: action.payload.error },
      };

    // 구독 재활성화
    case 'OPEN_REACTIVATION_MODAL':
      return {
        ...state,
        reactivationModal: {
          ...initialState.reactivationModal,
          isOpen: true,
        },
      };

    case 'CLOSE_REACTIVATION_MODAL':
      return {
        ...state,
        reactivationModal: initialState.reactivationModal,
      };

    case 'SELECT_REACTIVATION_OPTION':
      return {
        ...state,
        reactivationModal: {
          ...state.reactivationModal,
          selectedOption: action.payload.option,
        },
      };

    case 'REACTIVATE_SUBSCRIPTION_START':
      return {
        ...state,
        reactivationModal: {
          ...state.reactivationModal,
          isProcessing: true,
          error: null,
        },
        loading: { ...state.loading, reactivatingSubscription: true },
      };

    case 'REACTIVATE_SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        reactivationModal: initialState.reactivationModal,
        loading: { ...state.loading, reactivatingSubscription: false },
      };

    case 'REACTIVATE_SUBSCRIPTION_FAILURE':
      return {
        ...state,
        reactivationModal: {
          ...state.reactivationModal,
          isProcessing: false,
          error: action.payload.error,
        },
        loading: { ...state.loading, reactivatingSubscription: false },
        errors: { ...state.errors, reactivationError: action.payload.error },
      };

    // 결제 정보 변경
    case 'CHANGE_CARD_START':
      return {
        ...state,
        loading: { ...state.loading, changingCard: true },
      };

    case 'CHANGE_CARD_SUCCESS':
      return {
        ...state,
        subscription: {
          ...state.subscription,
          card_last_4digits: action.payload.card_last_4digits,
          card_type: action.payload.card_type,
        },
        loading: { ...state.loading, changingCard: false },
      };

    case 'CHANGE_CARD_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, changingCard: false },
        errors: { ...state.errors, paymentError: { code: 'CHANGE_CARD_FAILED', message: action.payload.error } },
      };

    default:
      return state;
  }
}
```

### 3.3 View (UI 컴포넌트)

Reducer의 상태를 구독하고 Action을 dispatch하는 컴포넌트들입니다.

#### (1) 구독 상태 카드 컴포넌트
```typescript
function SubscriptionStatusCard() {
  const { state, dispatch } = useSubscriptionContext();
  const { subscription, loading } = state;

  // Derived state: 뱃지 텍스트 및 색상
  const badgeInfo = useMemo(() => {
    if (subscription.subscription_status === 'active') {
      return { text: 'Pro 구독 중', color: 'green' };
    }
    if (subscription.subscription_status === 'pending_cancellation') {
      return { text: '해지 예정', color: 'yellow' };
    }
    return { text: '무료 플랜', color: 'gray' };
  }, [subscription.subscription_status]);

  // 구독 해지 버튼 클릭 시 Action dispatch
  const handleCancelClick = () => {
    dispatch({ type: 'OPEN_CANCELLATION_MODAL' });
  };

  if (loading.fetchingSubscription) {
    return <SkeletonLoader />;
  }

  return (
    <Card>
      <Badge color={badgeInfo.color}>{badgeInfo.text}</Badge>
      {subscription.subscription_status === 'active' && (
        <>
          <p>다음 결제일: {formatDate(subscription.next_payment_date)}</p>
          <p>결제 카드: {subscription.card_type} **** {subscription.card_last_4digits}</p>
          <Button onClick={handleCancelClick}>구독 해지</Button>
        </>
      )}
      {subscription.subscription_status === 'pending_cancellation' && (
        <>
          <p>혜택 종료일: {formatDate(subscription.effective_until)}</p>
          <p>남은 일수: {subscription.remaining_days}일</p>
          <Button onClick={() => dispatch({ type: 'OPEN_REACTIVATION_MODAL' })}>
            구독 재활성화
          </Button>
        </>
      )}
    </Card>
  );
}
```

#### (2) 약관 동의 컴포넌트
```typescript
function TermsAgreementModal() {
  const { state, dispatch } = useSubscriptionContext();
  const { termsAgreement, paymentProcess } = state;

  const handleTermsChange = (field: keyof TermsAgreementState, value: boolean) => {
    dispatch({
      type: 'UPDATE_TERMS',
      payload: { [field]: value },
    });
  };

  const handleProceedToPayment = async () => {
    dispatch({ type: 'LOAD_SDK_START' });
    // SDK 로딩 로직 (비동기)
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: user.id });
      dispatch({
        type: 'LOAD_SDK_SUCCESS',
        payload: { instance: tossPayments, payment },
      });
      dispatch({ type: 'REQUEST_BILLING_AUTH_START' });
      await payment.requestBillingAuth({ /* ... */ });
    } catch (error) {
      dispatch({
        type: 'LOAD_SDK_FAILURE',
        payload: { error: error.message },
      });
    }
  };

  return (
    <Modal open={paymentProcess.step === 'terms_agreement'}>
      <Checkbox
        checked={termsAgreement.termsAccepted}
        onChange={(e) => handleTermsChange('termsAccepted', e.target.checked)}
      >
        전자금융거래 이용약관 동의 (필수)
      </Checkbox>
      <Checkbox
        checked={termsAgreement.privacyAccepted}
        onChange={(e) => handleTermsChange('privacyAccepted', e.target.checked)}
      >
        개인정보 제3자 제공 동의 (필수)
      </Checkbox>
      <Checkbox
        checked={termsAgreement.autoPaymentAccepted}
        onChange={(e) => handleTermsChange('autoPaymentAccepted', e.target.checked)}
      >
        자동결제 동의 (필수)
      </Checkbox>
      <Button
        disabled={!termsAgreement.allAccepted}
        onClick={handleProceedToPayment}
      >
        결제하기
      </Button>
    </Modal>
  );
}
```

#### (3) 해지 모달 컴포넌트
```typescript
function CancellationModal() {
  const { state, dispatch } = useSubscriptionContext();
  const { cancellationModal, subscription } = state;

  const handleReasonSelect = (reason: string) => {
    dispatch({
      type: 'SELECT_CANCELLATION_REASON',
      payload: { reason },
    });
  };

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_CANCELLATION' });
  };

  const handleCancelSubscription = async () => {
    dispatch({ type: 'CANCEL_SUBSCRIPTION_START' });
    try {
      const response = await apiClient.delete('/api/subscription/cancel', {
        data: {
          cancellation_reason: cancellationModal.cancellation_reason,
          feedback: cancellationModal.feedback,
        },
      });
      dispatch({
        type: 'CANCEL_SUBSCRIPTION_SUCCESS',
        payload: response.data,
      });
    } catch (error) {
      dispatch({
        type: 'CANCEL_SUBSCRIPTION_FAILURE',
        payload: { error: error.message },
      });
    }
  };

  return (
    <Modal open={cancellationModal.isOpen} onClose={() => dispatch({ type: 'CLOSE_CANCELLATION_MODAL' })}>
      {cancellationModal.step === 'reason_selection' && (
        <>
          <h2>구독 해지 사유를 선택해주세요 (선택사항)</h2>
          <RadioGroup value={cancellationModal.cancellation_reason} onChange={handleReasonSelect}>
            <Radio value="가격이 비싸요">가격이 비싸요</Radio>
            <Radio value="사용 빈도가 낮아요">사용 빈도가 낮아요</Radio>
            <Radio value="서비스가 만족스럽지 않아요">서비스가 만족스럽지 않아요</Radio>
          </RadioGroup>
          <Button onClick={handleConfirm}>다음</Button>
        </>
      )}
      {cancellationModal.step === 'confirmation' && (
        <>
          <h2>정말 구독을 해지하시겠습니까?</h2>
          <p>{formatDate(subscription.next_payment_date)}까지 Pro 혜택이 유지됩니다</p>
          <Button onClick={handleCancelSubscription} loading={cancellationModal.isSubmitting}>
            해지하기
          </Button>
        </>
      )}
    </Modal>
  );
}
```

## 4. Context + useReducer 설계

### 4.1 Context 생성 및 Provider

```typescript
// SubscriptionContext.tsx
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

interface SubscriptionContextValue {
  state: SubscriptionContextState;
  dispatch: React.Dispatch<SubscriptionAction>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);

  // 초기 구독 정보 조회 (페이지 마운트 시)
  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    dispatch({ type: 'FETCH_SUBSCRIPTION_START' });
    try {
      const response = await apiClient.get('/api/subscription');
      dispatch({
        type: 'FETCH_SUBSCRIPTION_SUCCESS',
        payload: response.data,
      });
    } catch (error) {
      dispatch({
        type: 'FETCH_SUBSCRIPTION_FAILURE',
        payload: { error: error.message },
      });
    }
  };

  return (
    <SubscriptionContext.Provider value={{ state, dispatch }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
}
```

### 4.2 데이터 흐름 시각화

```
┌─────────────────────────────────────────────────────────────────┐
│                      SubscriptionProvider                        │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  useReducer(subscriptionReducer, initialState)        │      │
│  │                                                        │      │
│  │  [state, dispatch]                                    │      │
│  └───────────────────────────────────────────────────────┘      │
│                           │                                      │
│                           │ Context.Provider                     │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────┐      │
│  │              하위 컴포넌트들                            │      │
│  │                                                        │      │
│  │  SubscriptionStatusCard                               │      │
│  │    ├─ useSubscriptionContext()                        │      │
│  │    ├─ state.subscription 구독                         │      │
│  │    └─ dispatch({ type: 'OPEN_CANCELLATION_MODAL' })  │      │
│  │                                                        │      │
│  │  TermsAgreementModal                                  │      │
│  │    ├─ useSubscriptionContext()                        │      │
│  │    ├─ state.termsAgreement, paymentProcess 구독       │      │
│  │    └─ dispatch({ type: 'UPDATE_TERMS', payload })    │      │
│  │                                                        │      │
│  │  CancellationModal                                    │      │
│  │    ├─ useSubscriptionContext()                        │      │
│  │    ├─ state.cancellationModal 구독                    │      │
│  │    └─ dispatch({ type: 'CANCEL_SUBSCRIPTION_START' })│      │
│  │                                                        │      │
│  │  ReactivationModal                                    │      │
│  │    ├─ useSubscriptionContext()                        │      │
│  │    ├─ state.reactivationModal 구독                    │      │
│  │    └─ dispatch({ type: 'REACTIVATE_...', payload })  │      │
│  │                                                        │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

외부 API 통신:
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────┐
│ 토스페이먼츠 SDK │ ◄──► │  SubscriptionContext │ ◄──► │  Backend    │
│ (결제창)        │      │  (dispatch Actions)  │      │  (Hono API) │
└─────────────────┘      └──────────────────────┘      └─────────────┘
        │                          │                          │
        │ authKey, customerKey     │ POST /billing-key       │
        └─────────────────────────►└─────────────────────────►│
                                                        빌링키 발급
                                                        초회 결제
                                                        DB 저장
```

### 4.3 하위 컴포넌트에 노출할 인터페이스

#### (1) useSubscriptionContext Hook
```typescript
export function useSubscriptionContext(): {
  state: SubscriptionContextState;
  dispatch: React.Dispatch<SubscriptionAction>;
}
```

#### (2) 커스텀 Hooks (편의성 제공)
```typescript
// 구독 정보만 필요한 경우
export function useSubscription() {
  const { state } = useSubscriptionContext();
  return state.subscription;
}

// 결제 프로세스 상태
export function usePaymentProcess() {
  const { state, dispatch } = useSubscriptionContext();
  return {
    process: state.paymentProcess,
    terms: state.termsAgreement,
    initiateSubscription: () => dispatch({ type: 'INITIATE_SUBSCRIPTION' }),
    updateTerms: (payload) => dispatch({ type: 'UPDATE_TERMS', payload }),
    resetProcess: () => dispatch({ type: 'RESET_PAYMENT_PROCESS' }),
  };
}

// 해지 모달 관리
export function useCancellationModal() {
  const { state, dispatch } = useSubscriptionContext();
  return {
    modal: state.cancellationModal,
    openModal: () => dispatch({ type: 'OPEN_CANCELLATION_MODAL' }),
    closeModal: () => dispatch({ type: 'CLOSE_CANCELLATION_MODAL' }),
    selectReason: (reason, feedback) =>
      dispatch({ type: 'SELECT_CANCELLATION_REASON', payload: { reason, feedback } }),
    confirmCancellation: () => dispatch({ type: 'CONFIRM_CANCELLATION' }),
  };
}

// 재활성화 모달 관리
export function useReactivationModal() {
  const { state, dispatch } = useSubscriptionContext();
  return {
    modal: state.reactivationModal,
    openModal: () => dispatch({ type: 'OPEN_REACTIVATION_MODAL' }),
    closeModal: () => dispatch({ type: 'CLOSE_REACTIVATION_MODAL' }),
    selectOption: (option) => dispatch({ type: 'SELECT_REACTIVATION_OPTION', payload: { option } }),
  };
}

// 로딩 상태
export function useSubscriptionLoading() {
  const { state } = useSubscriptionContext();
  return state.loading;
}

// 에러 상태
export function useSubscriptionErrors() {
  const { state } = useSubscriptionContext();
  return state.errors;
}
```

### 4.4 비동기 로직 처리 (API 호출)

Context 내부에서 비동기 로직을 처리하기 위해 별도 함수로 분리합니다.

```typescript
// subscriptionActions.ts
export async function processPayment(
  dispatch: React.Dispatch<SubscriptionAction>,
  authKey: string,
  customerKey: string
) {
  dispatch({
    type: 'PROCESS_PAYMENT_START',
    payload: { authKey, customerKey },
  });

  try {
    const response = await apiClient.post('/api/subscription/billing-key', {
      authKey,
      customerKey,
    });

    dispatch({
      type: 'PROCESS_PAYMENT_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error) {
    const paymentError: PaymentError = {
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.error?.message || '결제 처리 중 오류가 발생했습니다',
    };

    dispatch({
      type: 'PROCESS_PAYMENT_FAILURE',
      payload: paymentError,
    });

    return { success: false, error: paymentError };
  }
}

export async function cancelSubscription(
  dispatch: React.Dispatch<SubscriptionAction>,
  reason: string | null,
  feedback: string
) {
  dispatch({ type: 'CANCEL_SUBSCRIPTION_START' });

  try {
    const response = await apiClient.delete('/api/subscription/cancel', {
      data: {
        cancellation_reason: reason,
        feedback,
      },
    });

    dispatch({
      type: 'CANCEL_SUBSCRIPTION_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error) {
    dispatch({
      type: 'CANCEL_SUBSCRIPTION_FAILURE',
      payload: { error: error.response?.data?.error?.message || '해지 처리 중 오류가 발생했습니다' },
    });

    return { success: false };
  }
}

export async function reactivateSubscription(
  dispatch: React.Dispatch<SubscriptionAction>,
  option: 'existing_card' | 'new_card',
  authKey?: string
) {
  dispatch({ type: 'REACTIVATE_SUBSCRIPTION_START' });

  try {
    const response = await apiClient.post('/api/subscription/reactivate', {
      option,
      authKey: option === 'new_card' ? authKey : undefined,
    });

    dispatch({
      type: 'REACTIVATE_SUBSCRIPTION_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error) {
    dispatch({
      type: 'REACTIVATE_SUBSCRIPTION_FAILURE',
      payload: { error: error.response?.data?.error?.message || '재활성화 처리 중 오류가 발생했습니다' },
    });

    return { success: false };
  }
}
```

### 4.5 하위 컴포넌트에서의 사용 예시

```typescript
// SubscriptionPage.tsx
export default function SubscriptionPage() {
  return (
    <SubscriptionProvider>
      <div className="container">
        <SubscriptionStatusCard />
        <SubscribeButton />
        <TermsAgreementModal />
        <CancellationModal />
        <ReactivationModal />
        <PaymentHistorySection />
      </div>
    </SubscriptionProvider>
  );
}

// SubscribeButton.tsx
function SubscribeButton() {
  const { initiateSubscription } = usePaymentProcess();
  const subscription = useSubscription();

  if (subscription.subscription_status === 'active') {
    return null; // 이미 구독 중이면 버튼 숨김
  }

  return (
    <Button onClick={initiateSubscription} size="large">
      Pro 구독하기
    </Button>
  );
}

// BillingSuccessPage.tsx (successUrl 리다이렉트 페이지)
function BillingSuccessPage() {
  const router = useRouter();
  const { dispatch } = useSubscriptionContext();
  const { authKey, customerKey } = router.query;

  useEffect(() => {
    if (authKey && customerKey) {
      processPayment(dispatch, authKey as string, customerKey as string).then((result) => {
        if (result.success) {
          router.push('/subscription/success');
        } else {
          router.push('/subscription/fail');
        }
      });
    }
  }, [authKey, customerKey]);

  return <LoadingSpinner message="결제 처리 중..." />;
}
```

## 5. 테스트 시나리오

### 5.1 단위 테스트 (Reducer)
```typescript
describe('subscriptionReducer', () => {
  it('should handle FETCH_SUBSCRIPTION_SUCCESS', () => {
    const action: FetchSubscriptionSuccessAction = {
      type: 'FETCH_SUBSCRIPTION_SUCCESS',
      payload: {
        subscription_id: 'sub_123',
        subscription_tier: 'pro',
        subscription_status: 'active',
        // ...
      },
    };

    const nextState = subscriptionReducer(initialState, action);

    expect(nextState.subscription.subscription_status).toBe('active');
    expect(nextState.loading.fetchingSubscription).toBe(false);
  });

  it('should update all terms when allAccepted is true', () => {
    const action: UpdateTermsAction = {
      type: 'UPDATE_TERMS',
      payload: {
        termsAccepted: true,
        privacyAccepted: true,
        autoPaymentAccepted: true,
      },
    };

    const nextState = subscriptionReducer(initialState, action);

    expect(nextState.termsAgreement.allAccepted).toBe(true);
  });
});
```

### 5.2 통합 테스트 (Context + Components)
```typescript
describe('SubscriptionProvider Integration', () => {
  it('should fetch subscription info on mount', async () => {
    const mockApiClient = {
      get: jest.fn().mockResolvedValue({
        data: { subscription_status: 'active' },
      }),
    };

    render(
      <SubscriptionProvider>
        <SubscriptionStatusCard />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Pro 구독 중')).toBeInTheDocument();
    });
  });
});
```

## 6. 성능 최적화

### 6.1 메모이제이션
- `useMemo`로 Derived State 계산 결과 캐싱
- `useCallback`으로 이벤트 핸들러 함수 메모이제이션

### 6.2 선택적 리렌더링
- Context를 기능별로 분리 (필요시):
  - `SubscriptionDataContext`: 구독 정보만
  - `PaymentProcessContext`: 결제 프로세스만
  - `ModalsContext`: 모달 상태만

### 6.3 코드 스플리팅
- 토스페이먼츠 SDK는 동적 import로 로드
  ```typescript
  const loadTossPayments = () => import('@tosspayments/tosspayments-sdk');
  ```

## 7. 보안 고려사항

### 7.1 민감 정보 노출 방지
- 빌링키는 절대 Frontend 상태에 저장하지 않음
- authKey는 일회성이므로 사용 후 즉시 초기화

### 7.2 CSRF 방지
- 모든 API 요청에 Clerk JWT 토큰 포함
- customerKey가 JWT의 user_id와 일치하는지 Backend에서 검증

### 7.3 XSS 방지
- 사용자 입력(feedback)은 서버에서 sanitize
- 마크다운 렌더링 시 HTML 이스케이프

## 8. 에러 복구 전략

### 8.1 네트워크 오류
- 자동 재시도 3회 (exponential backoff)
- 실패 시 "다시 시도" 버튼 제공

### 8.2 토스페이먼츠 SDK 로딩 실패
- CDN 대체 URL로 재시도
- 최종 실패 시 에러 메시지 + 고객 지원 안내

### 8.3 결제 실패 후 복구
- 사용자에게 에러 원인 명확히 안내
- "다른 카드로 시도" 옵션 제공
- 결제 실패 이력 로깅 (모니터링)

## 9. 향후 확장 고려사항

### 9.1 프로모션 코드
- `paymentProcess` 상태에 `promoCode` 필드 추가
- 할인된 가격 계산 로직 추가

### 9.2 연간 구독
- `subscription_type: 'monthly' | 'yearly'` 필드 추가
- 결제 금액 및 주기 동적 계산

### 9.3 구독 일시정지
- `subscription_status`에 'paused' 상태 추가
- 일시정지/재개 Action 추가

### 9.4 가족 플랜
- 다중 사용자 구독 관리
- `subscription` 상태에 `members` 배열 추가
