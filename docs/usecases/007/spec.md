# Use Case: 정기결제 자동 처리

## Primary Actor
시스템 (Supabase Cron Job)

## Precondition
- Supabase Cron Job이 설정되어 매일 02:00 KST에 실행됨
- 활성 Pro 구독자가 존재함 (`subscription_status = 'active'`)
- 결제 대상자의 `next_payment_date`가 오늘 날짜임
- 결제 대상자의 `billing_key`가 유효함
- 토스페이먼츠 API가 정상 작동 중

## Trigger
- Supabase Cron Job 자동 실행 (매일 02:00 KST)
- 또는 관리자의 수동 트리거 (긴급 상황)

## Main Scenario

### 1. Cron Job 시작
- Supabase Cron Job이 매일 02:00 KST에 자동 실행
- 또는 관리자가 `/api/admin/process-payment/trigger`를 호출하여 수동 실행
- 시스템이 실행 시작 로그 기록

### 2. 결제 대상 조회 (GET /api/cron/payment-status)
- Service Layer가 오늘 결제 대상 구독자 조회:
  ```sql
  SELECT
    s.id AS subscription_id,
    s.user_id,
    s.billing_key,
    s.price,
    s.next_payment_date,
    s.retry_count,
    u.email,
    u.name,
    u.clerk_user_id
  FROM subscriptions s
  JOIN users u ON s.user_id = u.id
  WHERE s.subscription_status = 'active'
    AND s.next_payment_date = CURRENT_DATE
    AND s.billing_key IS NOT NULL
  ORDER BY s.created_at ASC;
  ```
- 결제 대상자 수 로깅 (예: "총 15명의 결제 대상자 발견")

### 3. 배치 결제 처리 (POST /api/cron/process-payments)
- 각 구독자에 대해 순차적으로 결제 처리 (동시 실행 방지)
- 각 결제 처리마다 3초 간격 (Rate Limiting 준수)

#### 3.1. 주문 ID 생성
- 형식: `SUBSCRIPTION_{YYYYMMDD}_{user_id_prefix}`
- 예: `SUBSCRIPTION_20251027_abc123`
- 중복 방지를 위해 `payments.order_id` UNIQUE 제약 확인

#### 3.2. 토스페이먼츠 자동결제 API 호출
- Service Layer가 토스페이먼츠 자동결제 API 호출:
  ```
  POST https://api.tosspayments.com/v1/billing/{billingKey}
  ```
- 요청 헤더:
  ```
  Authorization: Basic {encoded_secret_key}
  Content-Type: application/json
  ```
- 요청 본문:
  ```json
  {
    "customerKey": "user_clerk_id",
    "amount": 9900,
    "orderId": "SUBSCRIPTION_20251027_abc123",
    "orderName": "VMC5 Pro 요금제 월 구독료",
    "customerEmail": "user@example.com",
    "customerName": "홍길동"
  }
  ```

### 4. 결제 성공 처리
- 토스페이먼츠 응답:
  ```json
  {
    "paymentKey": "pay_1234567890",
    "orderId": "SUBSCRIPTION_20251027_abc123",
    "status": "DONE",
    "approvedAt": "2025-10-27T02:00:15+09:00",
    "totalAmount": 9900,
    "method": "카드"
  }
  ```

#### 4.1. payments 테이블 INSERT
```sql
INSERT INTO payments (
  user_id,
  subscription_id,
  order_id,
  payment_key,
  amount,
  payment_method,
  payment_status,
  payment_type,
  approved_at,
  retry_count,
  created_at
) VALUES (
  $1, -- user_id
  $2, -- subscription_id
  $3, -- order_id
  $4, -- payment_key (토스페이먼츠)
  $5, -- amount (9900)
  '카드',
  'completed',
  'subscription',
  $6, -- approved_at
  0,
  NOW()
);
```

#### 4.2. subscriptions 테이블 UPDATE
```sql
UPDATE subscriptions
SET
  next_payment_date = next_payment_date + INTERVAL '1 month',
  retry_count = 0,
  updated_at = NOW()
WHERE id = $1;
```

#### 4.3. users 테이블 UPDATE (월 분석 횟수 리셋)
```sql
UPDATE users
SET
  monthly_analysis_count = 10,
  updated_at = NOW()
WHERE id = $1;
```

#### 4.4. 결제 성공 이메일 발송 (향후 구현)
- 수신자: 사용자 이메일
- 제목: "[VMC5] Pro 구독료 결제 완료"
- 내용:
  - 결제 일시
  - 결제 금액 (9,900원)
  - 다음 결제 예정일
  - 월 분석 횟수 리셋 안내 (10회)
  - 영수증 링크

### 5. 결제 실패 처리

#### 5.1. 토스페이먼츠 에러 응답
```json
{
  "code": "INVALID_CARD_EXPIRATION",
  "message": "카드 유효기간이 만료되었습니다."
}
```

#### 5.2. payments 테이블 INSERT (실패 기록)
```sql
INSERT INTO payments (
  user_id,
  subscription_id,
  order_id,
  amount,
  payment_status,
  payment_type,
  retry_count,
  created_at
) VALUES (
  $1,
  $2,
  $3,
  $4,
  'failed',
  'subscription',
  $5, -- 현재 retry_count
  NOW()
);
```

#### 5.3. subscriptions 테이블 UPDATE (재시도 카운트 증가)
```sql
UPDATE subscriptions
SET
  retry_count = retry_count + 1,
  updated_at = NOW()
WHERE id = $1;
```

#### 5.4. 재시도 스케줄링
- `retry_count < 3`인 경우:
  - `next_payment_date` 유지 (재시도는 다음 날 Cron Job에서 처리)
  - 재시도 안내 이메일 발송
- `retry_count >= 3`인 경우:
  - **최종 실패 처리** (시나리오 6으로 이동)

#### 5.5. 결제 실패 알림 이메일 발송
- 수신자: 사용자 이메일
- 제목: "[VMC5] Pro 구독료 결제 실패"
- 내용:
  - 결제 실패 사유
  - 재시도 일정 안내 (1일 후, 최대 3회)
  - 카드 정보 업데이트 링크
  - 구독 해지 방지 안내

### 6. 최종 실패 처리 (3회 재시도 실패 후)

#### 6.1. subscriptions 테이블 UPDATE
```sql
UPDATE subscriptions
SET
  subscription_status = 'suspended',
  billing_key = NULL,
  auto_renewal = false,
  cancelled_at = NOW(),
  cancellation_reason = '결제 실패 (3회)',
  updated_at = NOW()
WHERE id = $1;
```

#### 6.2. users 테이블 UPDATE (무료 전환)
```sql
UPDATE users
SET
  subscription_tier = 'free',
  monthly_analysis_count = 0,
  updated_at = NOW()
WHERE id = $1;
```

#### 6.3. 토스페이먼츠 빌링키 삭제
- Service Layer가 토스페이먼츠 빌링키 삭제 API 호출:
  ```
  DELETE https://api.tosspayments.com/v1/billing/authorizations/billing-key/{billingKey}
  ```
- 헤더:
  ```
  Authorization: Basic {encoded_secret_key}
  ```
- 성공 응답: 204 No Content

#### 6.4. 구독 해지 안내 이메일 발송
- 수신자: 사용자 이메일
- 제목: "[VMC5] Pro 구독이 자동 해지되었습니다"
- 내용:
  - 결제 실패로 인한 자동 해지 안내
  - 총 재시도 횟수 (3회)
  - 무료 회원으로 전환 안내
  - 재가입 유도 링크
  - 고객 지원 연락처

### 7. 배치 처리 완료
- 모든 결제 대상자 처리 완료 후 결과 집계:
  - 총 처리 건수
  - 성공 건수
  - 실패 건수 (재시도 예정)
  - 최종 실패 건수 (구독 해지)
- 결과 로그 기록
- 관리자 대시보드에 결과 표시 (향후 구현)

### 8. 모니터링 알람 전송 (에러 발생 시)
- 실패율 10% 이상 시 Slack/이메일 알람
- 토스페이먼츠 API 장애 감지 시 긴급 알람
- 결제 성공률 95% 미만 시 경고 알람

## Edge Cases

### 1. Cron Job 실행 실패
- **상황**: Supabase Cron Job 자체가 실행되지 않음 (시스템 장애 등)
- **처리**:
  - Supabase 모니터링 알람으로 감지
  - 관리자가 수동으로 `POST /api/admin/process-payment/trigger` 호출
  - 실행 로그에 수동 실행 기록
  - 다음 날 Cron Job 정상 작동 확인

### 2. 대량 결제 실패 (토스페이먼츠 장애)
- **상황**: 토스페이먼츠 API가 5xx 에러 반환 또는 타임아웃 발생 (10건 이상 연속 실패)
- **처리**:
  - 즉시 배치 처리 중단
  - 긴급 알람 전송 (Slack + 이메일)
  - 토스페이먼츠 장애 여부 확인
  - 장애 해소 후 수동으로 재실행
  - 실패 건수 모두 재시도 카운트에 포함하지 않음 (시스템 오류)

### 3. 중복 결제 방지
- **상황**: Cron Job이 중복 실행되거나 수동 트리거와 겹침
- **처리**:
  - `payments.order_id` UNIQUE 제약으로 중복 INSERT 방지
  - 중복 감지 시 트랜잭션 롤백
  - "이미 처리된 결제입니다" 로그 기록
  - 에러 응답 반환 (409 Conflict)

### 4. 결제 진행 중 구독 해지
- **상황**: 결제 처리 중 사용자가 웹에서 구독 해지 시도
- **처리**:
  - `subscriptions` 테이블에 `FOR UPDATE` 락 사용
  - 결제 처리 중에는 해지 API 차단 (409 Conflict)
  - 결제 완료 후 해지 가능
  - 이미 결제된 경우 다음 달부터 해지 적용

### 5. 타임존 이슈
- **상황**: 서버 시간과 KST가 다를 경우 결제일 불일치
- **처리**:
  - 모든 시간은 UTC로 저장, 비교 시 KST로 변환
  - `next_payment_date`는 날짜만 저장 (시간 제외)
  - Cron Job 실행 시간을 KST 02:00에 맞춤
  - 환경변수로 타임존 설정 (`TZ=Asia/Seoul`)

### 6. 부분 결제 금액
- **상황**: 토스페이먼츠가 부분 결제 (예: 9,900원 중 5,000원만 승인)
- **처리**:
  - 전액 결제만 허용 (`amount` 검증)
  - 부분 결제 감지 시 결제 취소 API 호출
  - 결제 실패로 처리 (재시도 카운트 증가)
  - 에러 로그 기록

### 7. 환율 변동 (향후 고려)
- **상황**: 해외 카드 사용 시 환율 변동
- **처리** (현재는 미적용):
  - 고정 KRW 금액 유지 (9,900원)
  - 환율 변동은 카드사에서 처리
  - 향후 다국적 서비스 시 고려

### 8. 데이터베이스 연결 오류
- **상황**: Supabase 연결 실패 또는 쿼리 타임아웃
- **처리**:
  - 재시도 로직 적용 (최대 3회)
  - 트랜잭션 롤백 후 재시도
  - 최종 실패 시 Cron Job 중단
  - 에러 로그 및 알람 전송
  - 다음 날 Cron Job에서 재처리

### 9. 빌링키 만료
- **상황**: 카드 유효기간 만료로 빌링키 무효화
- **처리**:
  - 토스페이먼츠가 `INVALID_CARD_EXPIRATION` 에러 반환
  - 결제 실패 처리 (재시도 카운트 증가)
  - 사용자에게 카드 정보 업데이트 안내 이메일 발송
  - 3회 실패 후 구독 자동 해지

### 10. Cron Job 실행 시간 지연
- **상황**: 서버 부하로 02:00이 아닌 02:30에 실행
- **처리**:
  - `next_payment_date = CURRENT_DATE` 조건으로 여전히 정상 처리
  - 다만 사용자는 늦은 시간에 결제 완료 알림 수신
  - 로그에 지연 시간 기록
  - 지속적 지연 시 서버 리소스 증설 고려

## Business Rules

### 결제 처리 정책
- 정기결제는 매일 02:00 KST에 자동 실행
- 결제 대상자는 `next_payment_date = 오늘` 기준으로 조회
- 결제 실패 시 최대 3회 재시도 (1일 간격)
- 3회 실패 후 자동으로 구독 해지 (`subscription_status = 'suspended'`)
- 결제 성공 시 월 분석 횟수 10회 자동 리셋

### 재시도 정책
- **1회 실패**: 다음 날 재시도 (총 2회 시도)
- **2회 실패**: 다음 날 재시도 (총 3회 시도)
- **3회 실패**: 최종 실패 처리 (구독 해지)
- 재시도 간격: 1일 (Cron Job 실행 주기)
- 재시도 중 사용자는 여전히 Pro 혜택 유지

### 빌링키 관리
- 결제 성공 시 빌링키 유지
- 3회 결제 실패 시 빌링키 삭제 (토스페이먼츠 API 호출)
- 빌링키 삭제 실패 시 에러 로깅 후 수동 처리
- 삭제된 빌링키는 복구 불가능 (재가입 시 새로 발급)

### 분석 횟수 정책
- 결제 성공 시 `monthly_analysis_count = 10`으로 리셋
- 결제 실패 후 재시도 중에는 횟수 리셋하지 않음
- 3회 실패 후 무료 전환 시 `monthly_analysis_count = 0`
- 무료 회원의 `free_analysis_count`는 변경하지 않음 (이미 소진된 상태)

### 이메일 알림 정책
- 결제 성공: 영수증 이메일 발송
- 결제 실패 (1~2회): 재시도 안내 이메일 발송
- 최종 실패 (3회): 구독 해지 안내 이메일 발송
- 토스페이먼츠 장애: 관리자에게만 긴급 알람

### External Service Integration

#### 토스페이먼츠 자동결제 API (Backend)
- **API 버전**: v1
- **Base URL**: `https://api.tosspayments.com/v1`
- **인증 방식**: Basic Auth (`SecretKey:` Base64 인코딩)

**자동결제 API:**
```
POST /billing/{billingKey}
```

**요청 헤더:**
```
Authorization: Basic {encoded_secret_key}
Content-Type: application/json
```

**요청 본문:**
```json
{
  "customerKey": "user_clerk_id",
  "amount": 9900,
  "orderId": "SUBSCRIPTION_20251027_abc123",
  "orderName": "VMC5 Pro 요금제 월 구독료",
  "customerEmail": "user@example.com",
  "customerName": "홍길동"
}
```

**성공 응답 (200 OK):**
```json
{
  "mId": "tosspayments",
  "version": "2022-11-16",
  "paymentKey": "pay_1234567890",
  "orderId": "SUBSCRIPTION_20251027_abc123",
  "orderName": "VMC5 Pro 요금제 월 구독료",
  "status": "DONE",
  "requestedAt": "2025-10-27T02:00:10+09:00",
  "approvedAt": "2025-10-27T02:00:15+09:00",
  "totalAmount": 9900,
  "balanceAmount": 9900,
  "suppliedAmount": 9000,
  "vat": 900,
  "method": "카드",
  "card": {
    "issuerCode": "61",
    "acquirerCode": "61",
    "number": "123456******7890",
    "installmentPlanMonths": 0,
    "isInterestFree": false,
    "cardType": "신용",
    "ownerType": "개인"
  }
}
```

**실패 응답 (400 Bad Request):**
```json
{
  "code": "INVALID_CARD_EXPIRATION",
  "message": "카드 유효기간이 만료되었습니다."
}
```

**기타 에러 코드:**
- `INSUFFICIENT_BALANCE`: 잔액 부족
- `INVALID_CARD_NUMBER`: 유효하지 않은 카드번호
- `CARD_COMPANY_REJECTED`: 카드사 승인 거부
- `EXCEED_MAX_DAILY_PAYMENT_COUNT`: 일일 결제 한도 초과
- `NOT_FOUND_BILLING_KEY`: 빌링키를 찾을 수 없음

**빌링키 삭제 API:**
```
DELETE /billing/authorizations/billing-key/{billingKey}
```

**요청 헤더:**
```
Authorization: Basic {encoded_secret_key}
```

**성공 응답 (204 No Content):**
- 본문 없음

**구현 예시:**
```typescript
// Service Layer
async function processAutomaticPayment(
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  customerEmail: string,
  customerName: string
): Promise<PaymentResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  const encodedKey = Buffer.from(secretKey + ':').toString('base64');

  const response = await fetch(
    `https://api.tosspayments.com/v1/billing/${billingKey}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount,
        orderId,
        orderName: 'VMC5 Pro 요금제 월 구독료',
        customerEmail,
        customerName,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new PaymentError(errorData.code, errorData.message);
  }

  return await response.json();
}
```

**재시도 정책:**
- 타임아웃: 30초
- 재시도 횟수: 즉시 재시도 없음 (다음 날 Cron Job에서 재시도)
- 토스페이먼츠 5xx 에러 시 에러 로깅 후 다음 날 재처리
- Rate Limiting: 각 결제 처리 사이 3초 간격

**참고 문서**: `/docs/external/tosspayments.md`

#### Supabase Cron Job
- **실행 주기**: 매일 02:00 KST
- **타임존**: Asia/Seoul
- **실행 함수**: `process_recurring_payments()`
- **타임아웃**: 30분 (대량 결제 처리 고려)
- **실패 시 재시도**: 없음 (다음 날 자동 재실행)

**Cron Job 설정 (Supabase Dashboard):**
```sql
-- pg_cron extension 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron Job 등록
SELECT cron.schedule(
  'process-recurring-payments',
  '0 2 * * *', -- 매일 02:00 KST
  $$
  SELECT net.http_post(
    url := 'https://your-domain.vercel.app/api/cron/process-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET_TOKEN"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 데이터 일관성
- 모든 결제 처리는 트랜잭션으로 관리
- 토스페이먼츠 API 호출 실패 시 트랜잭션 롤백
- 부분 성공 방지 (All or Nothing)
- 동시성 제어: `FOR UPDATE` 락 사용

### 보안 및 권한
- Cron Job 엔드포인트는 SECRET_TOKEN으로 인증
- 관리자 수동 트리거는 관리자 권한 필요 (Clerk)
- 토스페이먼츠 API 호출은 서버단에서만 가능
- 환경변수로 민감 정보 관리 (`TOSS_SECRET_KEY`)

### 모니터링 및 알람
- 결제 성공률 추적 (목표: 95% 이상)
- 평균 결제 처리 시간 모니터링
- 토스페이먼츠 API 응답 시간 추적
- 실패율 10% 이상 시 Slack 알람
- Cron Job 실행 실패 시 긴급 알람
- 일일 결제 처리 결과 리포트 (이메일)

## API Specification

### POST /api/cron/process-payments

정기결제 배치 처리 (Cron Job 전용)

**Request Headers:**
```
Authorization: Bearer {cron_secret_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "force": false, // true 시 재시도 카운트 무시하고 모든 active 구독 처리
  "user_ids": [] // 선택사항: 특정 사용자만 처리 (테스트용)
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "processed_count": 15,
    "success_count": 13,
    "failed_count": 2,
    "suspended_count": 0,
    "total_amount": 128700,
    "processing_time_ms": 45230,
    "details": [
      {
        "user_id": "uuid",
        "subscription_id": "uuid",
        "status": "success",
        "payment_key": "pay_1234567890",
        "amount": 9900
      },
      {
        "user_id": "uuid2",
        "subscription_id": "uuid2",
        "status": "failed",
        "error_code": "INVALID_CARD_EXPIRATION",
        "retry_count": 1
      }
    ]
  }
}
```

**Error Responses:**

- **401 Unauthorized** (인증 실패):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "유효하지 않은 Cron Secret Token입니다"
  }
}
```

- **500 Internal Server Error** (시스템 오류):
```json
{
  "success": false,
  "error": {
    "code": "SYSTEM_ERROR",
    "message": "배치 처리 중 오류가 발생했습니다"
  }
}
```

### GET /api/cron/payment-status

오늘의 결제 대상 조회 (모니터링 용도)

**Request Headers:**
```
Authorization: Bearer {cron_secret_token}
```

**Query Parameters:**
- `date`: 조회할 날짜 (YYYY-MM-DD, 기본값: 오늘)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "target_date": "2025-10-27",
    "total_count": 15,
    "pending_count": 10,
    "processing_count": 3,
    "completed_count": 2,
    "failed_count": 0,
    "targets": [
      {
        "user_id": "uuid",
        "subscription_id": "uuid",
        "user_name": "홍길동",
        "user_email": "user@example.com",
        "amount": 9900,
        "retry_count": 0,
        "status": "pending"
      }
    ]
  }
}
```

### POST /api/admin/process-payment/{userId}

특정 사용자 수동 결제 처리 (관리자 전용)

**Request Headers:**
```
Authorization: Bearer {clerk_admin_jwt_token}
```

**Path Parameters:**
- `userId`: 대상 사용자 ID (uuid)

**Request Body:**
```json
{
  "reason": "고객 요청으로 인한 수동 결제 처리"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "subscription_id": "uuid",
    "payment_id": "uuid",
    "payment_key": "pay_1234567890",
    "amount": 9900,
    "status": "completed",
    "processed_at": "2025-10-27T14:30:00Z"
  }
}
```

**Error Responses:**

- **403 Forbidden** (관리자 권한 없음):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "관리자 권한이 필요합니다"
  }
}
```

- **404 Not Found** (활성 구독 없음):
```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_NOT_FOUND",
    "message": "활성 구독을 찾을 수 없습니다"
  }
}
```

## Sequence Diagram

```plantuml
@startuml
participant "Supabase Cron Job" as Cron
participant "Hono Router\n(/api/cron/process-payments)" as Router
participant "Service Layer" as Service
participant "TossPayments API" as Toss
database "Database\n(Supabase)" as DB
participant "Email Service" as Email

== Cron Job 시작 ==
Cron -> Router: POST /api/cron/process-payments\nAuthorization: Bearer {cron_secret}
Router -> Router: SECRET_TOKEN 검증
Router -> Service: 배치 결제 처리 시작

== 결제 대상 조회 ==
Service -> DB: SELECT s.*, u.*\nFROM subscriptions s\nJOIN users u ON s.user_id = u.id\nWHERE s.subscription_status = 'active'\nAND s.next_payment_date = CURRENT_DATE\nAND s.billing_key IS NOT NULL
DB --> Service: 결제 대상 목록 (예: 15명)
Service -> Service: 로그 기록: "총 15명의 결제 대상자 발견"

== 배치 처리 (각 구독자) ==
loop 각 구독자 처리
    Service -> Service: order_id 생성\n(SUBSCRIPTION_20251027_{user_id})

    Service -> DB: BEGIN TRANSACTION
    Service -> DB: SELECT * FROM subscriptions\nWHERE id = $1\nFOR UPDATE

    Service -> Toss: POST /v1/billing/{billingKey}\nBody: {customerKey, amount, orderId, ...}
    note right of Toss
      요청 본문:
      - customerKey: user_clerk_id
      - amount: 9900
      - orderId: SUBSCRIPTION_20251027_abc123
      - orderName: "VMC5 Pro 요금제"
      - customerEmail, customerName
    end note

    alt 결제 성공
        Toss --> Service: 200 OK\n{paymentKey, status: "DONE", approvedAt}

        Service -> DB: INSERT INTO payments\n(user_id, subscription_id, order_id, payment_key,\namount, payment_status='completed', approved_at)
        Service -> DB: UPDATE subscriptions\nSET next_payment_date = next_payment_date + INTERVAL '1 month',\nretry_count = 0
        Service -> DB: UPDATE users\nSET monthly_analysis_count = 10

        Service -> DB: COMMIT TRANSACTION
        Service -> Email: 결제 성공 이메일 발송
        Email --> Service: 이메일 전송 완료

        Service -> Service: 로그: "결제 성공 - User: {user_id}, Amount: 9900"

    else 결제 실패 (1~2회)
        Toss --> Service: 400 Bad Request\n{code: "INVALID_CARD_EXPIRATION", message}

        Service -> DB: INSERT INTO payments\n(user_id, subscription_id, order_id, amount,\npayment_status='failed', retry_count)
        Service -> DB: UPDATE subscriptions\nSET retry_count = retry_count + 1

        Service -> DB: COMMIT TRANSACTION
        Service -> Email: 결제 실패 알림 이메일 (재시도 안내)
        Email --> Service: 이메일 전송 완료

        Service -> Service: 로그: "결제 실패 (재시도 {retry_count}/3) - User: {user_id}, Error: {code}"

    else 최종 실패 (3회)
        Toss --> Service: 400 Bad Request

        Service -> DB: INSERT INTO payments\n(payment_status='failed', retry_count=3)
        Service -> DB: UPDATE subscriptions\nSET subscription_status='suspended',\nbilling_key=NULL,\nauto_renewal=false,\ncancelled_at=NOW(),\ncancellation_reason='결제 실패 (3회)'
        Service -> DB: UPDATE users\nSET subscription_tier='free',\nmonthly_analysis_count=0

        Service -> Toss: DELETE /billing/authorizations/billing-key/{billingKey}
        Toss --> Service: 204 No Content

        Service -> DB: COMMIT TRANSACTION
        Service -> Email: 구독 해지 안내 이메일
        Email --> Service: 이메일 전송 완료

        Service -> Service: 로그: "최종 실패 - 구독 해지 - User: {user_id}"

    else 토스페이먼츠 장애 (5xx)
        Toss --> Service: 500 Internal Server Error

        Service -> DB: ROLLBACK TRANSACTION
        Service -> Service: 로그: "토스페이먼츠 오류 - 재시도 없음"
        Service -> Service: 다음 구독자 처리 계속
    end

    Service -> Service: 3초 대기 (Rate Limiting)
end

== 배치 처리 완료 ==
Service -> Service: 결과 집계\n- 총 처리: 15건\n- 성공: 13건\n- 실패 (재시도 예정): 2건\n- 최종 실패 (해지): 0건
Service -> Service: 로그 기록 및 결과 저장

alt 실패율 10% 이상
    Service -> Service: Slack 알람 전송\n"정기결제 실패율 높음: 13.3%"
end

Service --> Router: 배치 처리 결과
Router --> Cron: 200 OK\n{processed_count, success_count, failed_count, ...}

== 다음 날 재시도 ==
note over Cron, DB
  다음 날 02:00
  retry_count > 0인 구독자 자동 재시도
end note

@enduml
```

## Related Use Cases
- [UC-003] Pro 구독 신청
- [UC-006] Pro 구독 해지
- [UC-005] 구독 재활성화
- [UC-008] 결제 내역 조회

## Notes
- 이 유스케이스는 사용자 개입 없이 시스템이 자동으로 처리하는 백그라운드 프로세스입니다.
- 정기결제의 안정성은 서비스 수익에 직접적인 영향을 미치므로, 철저한 에러 처리와 모니터링이 필수입니다.
- 토스페이먼츠 API 장애 시 대응 매뉴얼이 필요하며, 수동 결제 처리 기능도 구현되어야 합니다.
- 결제 실패 시 사용자에게 적절한 안내와 함께 카드 정보 업데이트 기회를 제공하여 이탈을 방지합니다.
- Cron Job 실행 로그와 결제 결과는 반드시 모니터링 시스템에 통합하여 실시간 추적 가능해야 합니다.
- 향후 대량 구독자 증가 시 배치 처리 성능 최적화 (병렬 처리, 큐 시스템 도입 등) 고려가 필요합니다.
- 재시도 정책은 비즈니스 요구사항에 따라 조정 가능하며, 현재는 1일 간격 3회로 설정되어 있습니다.
