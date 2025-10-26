# 구독 관리 페이지 (Subscription) 요구사항

## 개요
구독 관리 페이지는 사용자가 Pro 구독의 신청, 해지, 재활성화, 결제 정보 변경 등 구독과 관련된 모든 작업을 수행하는 핵심 페이지입니다. 토스페이먼츠 SDK를 통한 결제 프로세스와 빌링키 기반 정기결제 시스템을 관리합니다.

**페이지 경로**: `/subscription`
**접근 권한**: 로그인 필수 (Clerk JWT 인증)

## 관련 Use Cases
- [UC-002] Pro 구독 신청 (`/docs/usecases/002/spec.md`)
- [UC-006] Pro 구독 해지 (`/docs/usecases/006/spec.md`)

## 주요 기능

### 1. 구독 상태 확인 및 표시

#### 행동
- 페이지 진입 시 현재 사용자의 구독 정보를 API로 조회
- GET /api/subscription 호출
- 인증 헤더: Bearer {clerk_jwt_token}

#### 데이터 흐름
1. **Frontend**: 페이지 마운트 시 React Query를 통해 구독 정보 fetch
2. **Backend (Hono Router)**: JWT 토큰 검증 후 사용자 ID 추출
3. **Service Layer**: Supabase에서 구독 정보 조회
   ```sql
   SELECT
     s.id,
     s.subscription_status,
     s.next_payment_date,
     s.card_last_4digits,
     s.card_type,
     s.price,
     s.auto_renewal,
     s.effective_until,
     u.subscription_tier,
     u.monthly_analysis_count
   FROM subscriptions s
   INNER JOIN users u ON s.user_id = u.id
   WHERE s.user_id = $1
     AND s.subscription_status IN ('active', 'pending_cancellation')
   ORDER BY s.created_at DESC
   LIMIT 1;
   ```
4. **Frontend**: 응답 데이터를 상태로 저장하고 UI 렌더링

#### 표시 정보
- **무료 회원 (subscription_tier = 'free')**:
  - "무료 플랜" 뱃지
  - 남은 무료 분석 횟수 (초기 3회, 소진 후 0회)
  - "Pro 구독하기" CTA 버튼

- **Pro 회원 (subscription_status = 'active')**:
  - "Pro 구독 중" 뱃지 (녹색)
  - 월 분석 가능 횟수 (X/10회)
  - 다음 결제일
  - 등록된 카드 정보 (카드 종류, 마지막 4자리)
  - 결제 금액 (9,900원)
  - "구독 해지" 버튼
  - "결제 정보 변경" 버튼

- **해지 예정 (subscription_status = 'pending_cancellation')**:
  - "해지 예정" 뱃지 (노란색)
  - 혜택 종료일 (effective_until)
  - 남은 일수 표시
  - "구독 재활성화" 버튼
  - 안내 메시지: "YYYY-MM-DD까지 Pro 혜택이 유지됩니다"

### 2. Pro 구독 신청

#### 행동 흐름
1. 사용자가 "Pro 구독하기" 버튼 클릭
2. 약관 동의 모달 표시
   - 전자금융거래 이용약관
   - 개인정보 제3자 제공 동의
   - 자동결제 동의
3. 모든 약관 동의 후 "결제하기" 버튼 활성화
4. 토스페이먼츠 SDK 호출로 결제창 오픈

#### 토스페이먼츠 SDK 통합
```typescript
// 1. SDK 로드
const tossPayments = await loadTossPayments(NEXT_PUBLIC_TOSS_CLIENT_KEY);

// 2. Payment 인스턴스 생성
const payment = tossPayments.payment({
  customerKey: clerk_user_id  // Clerk에서 받은 사용자 고유 ID
});

// 3. 빌링키 발급 요청
await payment.requestBillingAuth({
  method: 'CARD',
  successUrl: `${window.location.origin}/subscription/billing-success`,
  failUrl: `${window.location.origin}/subscription/billing-fail`,
  customerName: user.name,
  customerEmail: user.email
});
```

#### successUrl 처리 (/subscription/billing-success)
1. URL에서 `authKey`, `customerKey` 추출
   ```
   ?authKey={authKey}&customerKey={customerKey}
   ```
2. POST /api/subscription/billing-key 호출
   ```json
   {
     "authKey": "토스페이먼츠_발급_authKey",
     "customerKey": "clerk_user_id"
   }
   ```
3. 로딩 상태 표시 (빌링키 발급 및 초회 결제 진행 중)

#### Backend 처리 (POST /api/subscription/billing-key)
1. **Validation**:
   - authKey, customerKey 필수 확인 (Zod 스키마)
   - customerKey가 JWT의 user_id와 일치하는지 검증

2. **기존 구독 확인**:
   ```sql
   SELECT id FROM subscriptions
   WHERE user_id = $1
     AND subscription_status = 'active';
   ```
   - 이미 활성 구독이 있으면 `400 ALREADY_SUBSCRIBED` 에러 반환

3. **빌링키 발급 (토스페이먼츠 API)**:
   ```
   POST https://api.tosspayments.com/v1/billing/authorizations/issue
   Authorization: Basic {Base64(TOSS_SECRET_KEY:)}
   Content-Type: application/json

   {
     "authKey": "{authKey}",
     "customerKey": "{clerk_user_id}"
   }
   ```
   - 성공 시 응답: `{ billingKey, customerKey, method, card: {...} }`

4. **초회 결제 실행**:
   ```
   POST https://api.tosspayments.com/v1/billing/{billingKey}
   Authorization: Basic {Base64(TOSS_SECRET_KEY:)}

   {
     "customerKey": "{clerk_user_id}",
     "amount": 9900,
     "orderId": "SUB_{user_id}_{timestamp}",
     "orderName": "Pro 요금제 월 구독료",
     "customerEmail": "{user.email}",
     "customerName": "{user.name}"
   }
   ```
   - 성공 시 응답: `{ paymentKey, orderId, status: 'DONE', approvedAt }`

5. **데이터베이스 트랜잭션**:
   ```sql
   BEGIN TRANSACTION;

   -- subscriptions 테이블에 INSERT
   INSERT INTO subscriptions (
     user_id,
     billing_key,
     card_last_4digits,
     card_type,
     subscription_status,
     next_payment_date,
     auto_renewal,
     price
   ) VALUES (
     $1,
     '{billingKey}',
     '{card.number의 마지막 4자리}',
     '{card.cardType}',
     'active',
     CURRENT_DATE + INTERVAL '1 month',
     true,
     9900
   ) RETURNING id;

   -- users 테이블 UPDATE
   UPDATE users
   SET subscription_tier = 'pro',
       monthly_analysis_count = 10,
       updated_at = NOW()
   WHERE id = $1;

   -- payments 테이블에 INSERT
   INSERT INTO payments (
     user_id,
     subscription_id,
     order_id,
     payment_key,
     amount,
     payment_method,
     payment_status,
     payment_type,
     approved_at
   ) VALUES (
     $1, $2, '{orderId}', '{paymentKey}',
     9900, '카드', 'completed', 'subscription', '{approvedAt}'
   );

   COMMIT;
   ```

6. **에러 처리**:
   - 빌링키 발급 실패: `500 BILLING_KEY_ISSUE_FAILED`
   - 초회 결제 실패: 발급받은 빌링키 삭제 후 `400 INITIAL_PAYMENT_FAILED`
   - DB 오류: 트랜잭션 롤백, 빌링키 삭제 후 `500 INTERNAL_SERVER_ERROR`

#### Frontend 응답 처리
- **성공 (200 OK)**:
  - `/subscription/success` 페이지로 리다이렉트
  - 성공 메시지 표시: "Pro 구독이 완료되었습니다!"
  - 다음 결제일, 월 10회 분석 가능 안내
  - "분석 시작하기" 버튼으로 대시보드 이동

- **실패 (400/500)**:
  - 에러 메시지 모달 표시
  - 에러 코드별 메시지:
    - `ALREADY_SUBSCRIBED`: "이미 Pro 구독 중입니다"
    - `INITIAL_PAYMENT_FAILED`: "결제에 실패했습니다. 카드 정보를 확인해주세요"
    - `BILLING_KEY_ISSUE_FAILED`: "결제 정보 등록에 실패했습니다"
  - "다시 시도" 버튼 제공

#### failUrl 처리 (/subscription/billing-fail)
1. URL에서 `code`, `message` 추출
2. 에러 메시지 표시
3. 구독 관리 페이지로 복귀 버튼

### 3. 구독 해지

#### 행동 흐름
1. 사용자가 "구독 해지" 버튼 클릭
2. 해지 확인 모달 표시
   - 해지 사유 선택 (선택사항):
     - "가격이 비싸요"
     - "사용 빈도가 낮아요"
     - "서비스가 만족스럽지 않아요"
     - "기타" (직접 입력 가능)
   - 주의사항 안내:
     - "다음 결제일(YYYY-MM-DD)까지 Pro 혜택이 유지됩니다"
     - "해지 후에도 결제일 전까지 언제든 재활성화할 수 있습니다"
     - "해지 후 무료 회원으로 전환되며, 무료 분석 횟수는 0회입니다"
3. "구독 해지 확인" 버튼 클릭
4. 최종 확인 모달 ("정말 해지하시겠습니까?")
5. "해지하기" 버튼 클릭

#### Backend 처리 (DELETE /api/subscription/cancel)
1. **요청 본문 (Zod 검증)**:
   ```json
   {
     "cancellation_reason": "가격이 비싸요",  // 선택사항
     "feedback": "월 요금이 부담스러워요"    // 선택사항
   }
   ```

2. **구독 상태 확인**:
   ```sql
   SELECT id, billing_key, next_payment_date
   FROM subscriptions
   WHERE user_id = $1
     AND subscription_status = 'active'
   FOR UPDATE;
   ```
   - 활성 구독이 없으면 `404 SUBSCRIPTION_NOT_FOUND` 에러

3. **토스페이먼츠 빌링키 삭제**:
   ```
   DELETE https://api.tosspayments.com/v1/billing/authorizations/billing-key/{billingKey}
   Authorization: Basic {Base64(TOSS_SECRET_KEY:)}
   ```
   - 성공: 204 No Content
   - 실패 시 최대 3회 재시도 (1초, 2초, 4초 간격)
   - 최종 실패: `503 PAYMENT_SERVICE_ERROR`

4. **데이터베이스 업데이트**:
   ```sql
   BEGIN TRANSACTION;

   -- subscriptions 테이블 UPDATE
   UPDATE subscriptions
   SET subscription_status = 'pending_cancellation',
       cancelled_at = NOW(),
       cancellation_reason = $1,
       billing_key = NULL,
       auto_renewal = false,
       effective_until = next_payment_date,
       updated_at = NOW()
   WHERE user_id = $2
     AND subscription_status = 'active';

   -- 해지 피드백 저장 (선택사항)
   INSERT INTO subscription_cancellations (
     user_id,
     subscription_id,
     cancellation_reason,
     feedback,
     cancelled_at
   ) VALUES ($1, $2, $3, $4, NOW());

   COMMIT;
   ```

5. **응답**:
   ```json
   {
     "success": true,
     "data": {
       "subscription_status": "pending_cancellation",
       "effective_until": "2025-11-26",
       "remaining_days": 15,
       "message": "구독이 해지되었습니다. 2025-11-26까지 Pro 혜택이 유지됩니다."
     }
   }
   ```

#### Frontend 응답 처리
- 성공 시:
  - 모달 닫기
  - 성공 토스트 메시지 표시
  - 구독 정보 자동 새로고침 (React Query invalidate)
  - UI 업데이트: "해지 예정" 뱃지, "구독 재활성화" 버튼 표시

### 4. 구독 재활성화

#### 조건
- 현재 구독 상태가 `pending_cancellation`
- `effective_until` (혜택 종료일)이 아직 도래하지 않음

#### 행동 흐름
1. 사용자가 "구독 재활성화" 버튼 클릭
2. 재활성화 확인 모달 표시
   - "기존 결제 정보를 사용하시겠습니까?"
   - 옵션 1: "새 카드 등록" (토스페이먼츠 SDK 재호출)
   - 옵션 2: "기존 카드 사용" (새 빌링키 발급 필요)
3. 선택에 따라 처리

#### Backend 처리 (POST /api/subscription/reactivate)
1. **구독 상태 확인**:
   ```sql
   SELECT id, effective_until, next_payment_date
   FROM subscriptions
   WHERE user_id = $1
     AND subscription_status = 'pending_cancellation'
     AND effective_until >= CURRENT_DATE;
   ```

2. **새 빌링키 발급** (기존 카드 사용 또는 새 카드 등록):
   - 토스페이먼츠 SDK를 통해 새 authKey 발급
   - POST /api/subscription/billing-key 재호출
   - 단, 기존 subscription 레코드 UPDATE

3. **구독 재활성화**:
   ```sql
   UPDATE subscriptions
   SET subscription_status = 'active',
       billing_key = '{new_billingKey}',
       auto_renewal = true,
       cancelled_at = NULL,
       cancellation_reason = NULL,
       effective_until = NULL,
       updated_at = NOW()
   WHERE id = $1;
   ```

4. **응답**:
   ```json
   {
     "success": true,
     "data": {
       "subscription_status": "active",
       "next_payment_date": "2025-11-26",
       "message": "구독이 재활성화되었습니다"
     }
   }
   ```

### 5. 결제 정보 변경

#### 행동 흐름
1. 사용자가 "결제 정보 변경" 버튼 클릭
2. 안내 모달 표시:
   - "새 카드를 등록하면 기존 결제 정보가 삭제됩니다"
   - "다음 결제일에 새 카드로 자동 결제됩니다"
3. "카드 변경하기" 버튼 클릭
4. 토스페이먼츠 SDK 재호출 (구독 신청과 동일한 프로세스)

#### Backend 처리 (POST /api/subscription/change-card)
1. **기존 빌링키 삭제**:
   ```
   DELETE https://api.tosspayments.com/v1/billing/authorizations/billing-key/{old_billingKey}
   ```

2. **새 빌링키 발급** (authKey로):
   ```
   POST /v1/billing/authorizations/issue
   ```

3. **구독 정보 업데이트**:
   ```sql
   UPDATE subscriptions
   SET billing_key = '{new_billingKey}',
       card_last_4digits = '{new_card_last_4digits}',
       card_type = '{new_card_type}',
       updated_at = NOW()
   WHERE user_id = $1
     AND subscription_status = 'active';
   ```

4. **트랜잭션 처리**:
   - 기존 빌링키 삭제 → 새 빌링키 발급 → DB 업데이트
   - 어느 단계든 실패 시 전체 롤백

### 6. 결제 내역 조회

#### 행동
- "결제 내역" 탭 클릭
- GET /api/subscription/payments 호출

#### 데이터 조회
```sql
SELECT
  p.order_id,
  p.amount,
  p.payment_method,
  p.payment_status,
  p.payment_type,
  p.approved_at,
  p.created_at
FROM payments p
WHERE p.user_id = $1
ORDER BY p.created_at DESC
LIMIT 50;
```

#### 표시 정보
- 결제 일시
- 결제 금액
- 결제 수단 (카드 종류, 마지막 4자리)
- 결제 상태 (완료/실패/취소)
- 결제 유형 (정기결제/환불)

## 데이터베이스 스키마

### subscriptions 테이블
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_key TEXT,  -- 토스페이먼츠 빌링키 (암호화 권장)
  card_last_4digits VARCHAR(4),
  card_type VARCHAR(20),  -- '신용', '체크'
  subscription_status VARCHAR(30) NOT NULL,  -- 'active', 'pending_cancellation', 'cancelled', 'suspended'
  next_payment_date DATE,
  auto_renewal BOOLEAN DEFAULT true,
  price INTEGER NOT NULL DEFAULT 9900,
  effective_until DATE,  -- 해지 시 혜택 종료일
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### payments 테이블
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  payment_key VARCHAR(200),  -- 토스페이먼츠 paymentKey
  amount INTEGER NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(30),  -- 'pending', 'completed', 'failed', 'cancelled'
  payment_type VARCHAR(30),  -- 'subscription', 'refund'
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### subscription_cancellations 테이블 (해지 피드백)
```sql
CREATE TABLE subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  cancellation_reason TEXT,
  feedback TEXT,
  cancelled_at TIMESTAMP DEFAULT NOW()
);
```

## 보안 및 권한

### 인증
- 모든 API 요청에 Clerk JWT 토큰 필수
- JWT에서 user_id 추출하여 본인 확인
- 타인의 구독 정보 접근 차단

### 토스페이먼츠 키 관리
- **Client Key**: 환경변수 `NEXT_PUBLIC_TOSS_CLIENT_KEY` (프론트엔드 노출 가능)
- **Secret Key**: 환경변수 `TOSS_SECRET_KEY` (서버에서만 사용, 절대 노출 금지)
- Secret Key는 Base64 인코딩 후 Basic Auth에 사용
  ```typescript
  const encodedKey = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');
  ```

### 데이터 보안
- 빌링키는 DB에 암호화 저장 권장 (AES-256)
- 카드 전체 번호는 토스페이먼츠에서만 관리, DB에 저장 금지
- PCI DSS 준수: 카드 정보는 Frontend → 토스페이먼츠 직접 전송

## 에러 처리

### API 에러 코드
- `ALREADY_SUBSCRIBED` (400): 이미 활성 구독 존재
- `SUBSCRIPTION_NOT_FOUND` (404): 활성 구독 없음
- `BILLING_KEY_ISSUE_FAILED` (500): 빌링키 발급 실패
- `INITIAL_PAYMENT_FAILED` (400): 초회 결제 실패
- `PAYMENT_SERVICE_ERROR` (503): 토스페이먼츠 API 연동 실패
- `UNAUTHORIZED` (401): 인증 실패

### Frontend 에러 처리
- 네트워크 오류: 3회 재시도 (exponential backoff)
- 타임아웃: 30초 후 에러 메시지 표시
- 세션 만료: 자동 로그아웃 후 로그인 페이지로 리다이렉트
- 결제 실패: 에러 메시지 표시 후 "다시 시도" 버튼

## 성능 및 모니터링

### 로딩 상태
- 구독 정보 조회: 스켈레톤 UI 표시
- 결제 처리 중: 진행 중 애니메이션 + 예상 시간 표시
- 토스페이먼츠 SDK 로딩: "결제 준비 중..." 메시지

### 캐싱
- 구독 정보: React Query로 5분간 캐시
- 결제 내역: 10분간 캐시
- 구독 상태 변경 시 즉시 invalidate

### 모니터링
- 결제 성공률 추적 (목표: 95% 이상)
- 토스페이먼츠 API 응답 시간 로깅
- 구독 전환율 (무료 → Pro) 추적
- 해지율 (Churn Rate) 모니터링

## UI/UX 고려사항

### 반응형 디자인
- 모바일: 단일 컬럼, 카드 형태
- 태블릿/데스크톱: 2단 레이아웃 (현재 상태 + 액션)

### 접근성
- 모든 버튼에 aria-label 제공
- 키보드 네비게이션 지원
- 색상만으로 정보 전달 금지 (텍스트 병기)
- 스크린 리더 호환

### 사용자 안내
- 각 단계마다 명확한 안내 메시지
- 로딩 중 진행 상황 표시
- 에러 발생 시 해결 방법 제시
- 약관 및 주의사항 명시적으로 표시
