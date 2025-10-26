# Database Schema Design

## 1. 데이터 플로우 다이어그램

### 1.1 사용자 회원가입 플로우
```
[Clerk OAuth]
    ↓ (user.created webhook)
[Webhook Handler]
    ↓ (사용자 정보 파싱)
[users 테이블 INSERT]
    - user_id (Clerk ID)
    - email
    - name
    - profile_image
    - subscription_tier = 'free'
    - free_analysis_count = 3
```

### 1.2 사주 분석 플로우
```
[분석 요청]
    ↓ (사용자 입력: 이름, 생년월일, 출생시간, 성별)
[횟수 확인]
    - Free: free_analysis_count > 0
    - Pro: monthly_analysis_count > 0
    ↓ (OK)
[analyses 테이블 INSERT]
    - status = 'processing'
    ↓
[Gemini API 호출]
    - Free: gemini-2.0-flash
    - Pro: gemini-2.0-pro
    ↓ (AI 응답 수신)
[analyses 테이블 UPDATE]
    - analysis_result (JSON)
    - status = 'completed'
    ↓
[사용자 횟수 차감]
    - Free: free_analysis_count - 1
    - Pro: monthly_analysis_count - 1
```

### 1.3 구독 결제 플로우
```
[Pro 구독 신청]
    ↓
[토스페이먼츠 결제창]
    - requestBillingAuth()
    ↓ (카드 정보 입력)
[authKey 수신]
    ↓
[빌링키 발급 API]
    - POST /v1/billing/authorizations/issue
    ↓
[subscriptions 테이블 INSERT]
    - billing_key
    - subscription_status = 'active'
    - next_payment_date = 현재 + 1개월
    ↓
[users 테이블 UPDATE]
    - subscription_tier = 'pro'
    - monthly_analysis_count = 10
    ↓
[payments 테이블 INSERT]
    - payment_status = 'completed'
```

### 1.4 정기결제 플로우 (매월 자동)
```
[Supabase Cron Job] (매일 02:00 실행)
    ↓
[결제 대상 조회]
    - subscription_status = 'active'
    - next_payment_date = 오늘
    ↓
[토스페이먼츠 자동결제 API]
    - POST /v1/billing/{billingKey}
    ↓ (성공)
[subscriptions 테이블 UPDATE]
    - next_payment_date = 현재 + 1개월
    ↓
[users 테이블 UPDATE]
    - monthly_analysis_count = 10 (초기화)
    ↓
[payments 테이블 INSERT]
    - payment_status = 'completed'
```

### 1.5 구독 해지 플로우
```
[구독 해지 요청]
    ↓
[subscriptions 테이블 UPDATE]
    - subscription_status = 'pending_cancellation'
    - cancelled_at = 현재 시간
    ↓
[토스페이먼츠 빌링키 삭제]
    - 자동결제 중지
    ↓
[subscriptions 테이블 UPDATE]
    - billing_key = null
    - auto_renewal = false
    ↓
[effective_until 도래 시] (다음 결제일)
    ↓
[users 테이블 UPDATE]
    - subscription_tier = 'free'
    - free_analysis_count = 0
```

---

## 2. 데이터베이스 스키마

### 2.1 users (사용자)

사용자 기본 정보 및 구독 상태를 관리하는 핵심 테이블

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 내부 사용자 ID |
| clerk_user_id | text | UNIQUE, NOT NULL | Clerk에서 발급한 사용자 고유 ID |
| email | text | NOT NULL | 사용자 이메일 (Clerk OAuth에서 수신) |
| name | text | NULL | 사용자 이름 |
| profile_image | text | NULL | 프로필 이미지 URL |
| subscription_tier | text | NOT NULL, DEFAULT 'free' | 구독 등급: 'free', 'pro' |
| free_analysis_count | integer | NOT NULL, DEFAULT 3 | 무료 분석 잔여 횟수 |
| monthly_analysis_count | integer | NOT NULL, DEFAULT 0 | Pro 월간 분석 잔여 횟수 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 계정 생성일 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 정보 수정일 |

**인덱스:**
- `idx_users_clerk_user_id` ON `clerk_user_id` (고유 조회 최적화)

**비즈니스 룰:**
- Clerk Webhook(`user.created`)으로 생성
- 회원가입 시 `free_analysis_count = 3` 자동 부여
- Pro 구독 시 `subscription_tier = 'pro'`, `monthly_analysis_count = 10`
- 매월 1일 Cron Job으로 Pro 회원의 `monthly_analysis_count` 초기화

---

### 2.2 analyses (분석 이력)

사주 분석 요청 및 결과를 저장하는 테이블

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 분석 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 사용자 ID |
| subject_name | text | NOT NULL | 분석 대상 이름 |
| birth_date | date | NOT NULL | 생년월일 |
| birth_time | time | NULL | 출생시간 (선택) |
| gender | text | NOT NULL | 성별: 'male', 'female' |
| ai_model | text | NOT NULL | 사용된 AI 모델: 'gemini-2.0-flash', 'gemini-2.0-pro' |
| analysis_result | jsonb | NULL | AI 분석 결과 (JSON 형식) |
| status | text | NOT NULL, DEFAULT 'processing' | 상태: 'processing', 'completed', 'failed' |
| view_count | integer | NOT NULL, DEFAULT 0 | 조회 수 |
| last_viewed_at | timestamptz | NULL | 마지막 조회 시간 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 분석 생성일 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 분석 수정일 |

**인덱스:**
- `idx_analyses_user_id` ON `user_id` (사용자별 조회 최적화)
- `idx_analyses_created_at` ON `created_at DESC` (최신순 정렬 최적화)

**비즈니스 룰:**
- Free 회원: `ai_model = 'gemini-2.0-flash'`
- Pro 회원: `ai_model = 'gemini-2.0-pro'`
- 분석 요청 시 `status = 'processing'` → Gemini API 호출 후 `'completed'` 또는 `'failed'`
- `analysis_result` 구조:
  ```json
  {
    "heavenly_stems": {...},  // 천간지지
    "five_elements": {...},   // 오행분석
    "fortune_flow": {...},    // 대운/세운
    "interpretation": {       // 종합해석
      "personality": "...",
      "wealth": "...",
      "health": "...",
      "love": "..."
    }
  }
  ```

---

### 2.3 subscriptions (구독 정보)

Pro 구독 및 결제 정보를 관리하는 테이블

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 구독 ID |
| user_id | uuid | UNIQUE, NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 사용자 ID (1:1) |
| billing_key | text | NULL | 토스페이먼츠 빌링키 |
| card_last_4digits | text | NULL | 카드 마지막 4자리 |
| card_type | text | NULL | 카드 타입: '신용', '체크' |
| subscription_status | text | NOT NULL, DEFAULT 'active' | 상태: 'active', 'pending_cancellation', 'suspended' |
| next_payment_date | date | NULL | 다음 결제일 |
| auto_renewal | boolean | NOT NULL, DEFAULT true | 자동갱신 여부 |
| price | integer | NOT NULL | 구독 가격 (원) |
| cancelled_at | timestamptz | NULL | 구독 해지 요청 시간 |
| effective_until | date | NULL | 혜택 종료일 (해지 시 설정) |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 구독 시작일 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 구독 정보 수정일 |

**인덱스:**
- `idx_subscriptions_user_id` ON `user_id` (고유 조회)
- `idx_subscriptions_next_payment_date` ON `next_payment_date` (Cron Job 최적화)

**비즈니스 룰:**
- Pro 구독 신청 시 생성
- `billing_key`: 토스페이먼츠 빌링키 발급 후 저장
- `next_payment_date`: 매월 동일 날짜 자동 갱신
- 구독 해지 시:
  - `subscription_status = 'pending_cancellation'`
  - `billing_key = null`
  - `auto_renewal = false`
  - `effective_until = next_payment_date`
- 결제 실패 3회 시 `subscription_status = 'suspended'`

---

### 2.4 payments (결제 내역)

모든 결제 트랜잭션을 기록하는 테이블

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 결제 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 사용자 ID |
| subscription_id | uuid | NULL, REFERENCES subscriptions(id) ON DELETE SET NULL | 구독 ID |
| order_id | text | UNIQUE, NOT NULL | 주문 ID (토스페이먼츠 orderId) |
| payment_key | text | NULL | 결제 고유 키 (토스페이먼츠 paymentKey) |
| amount | integer | NOT NULL | 결제 금액 (원) |
| payment_method | text | NULL | 결제 수단: '카드', '계좌이체' 등 |
| payment_status | text | NOT NULL, DEFAULT 'pending' | 상태: 'pending', 'completed', 'failed', 'cancelled' |
| payment_type | text | NOT NULL | 결제 유형: 'subscription', 'refund' |
| approved_at | timestamptz | NULL | 결제 승인 시간 |
| cancelled_at | timestamptz | NULL | 결제 취소 시간 |
| cancel_reason | text | NULL | 취소 사유 |
| retry_count | integer | NOT NULL, DEFAULT 0 | 결제 재시도 횟수 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 결제 생성일 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 결제 정보 수정일 |

**인덱스:**
- `idx_payments_user_id` ON `user_id` (사용자별 조회)
- `idx_payments_order_id` ON `order_id` (고유 조회)
- `idx_payments_created_at` ON `created_at DESC` (최신순 정렬)

**비즈니스 룰:**
- Pro 구독 결제 시 생성
- 정기결제 성공 시 `payment_status = 'completed'`, `approved_at = 현재 시간`
- 결제 실패 시 `payment_status = 'failed'`, `retry_count + 1`
- 환불 시 `payment_type = 'refund'`, `payment_status = 'cancelled'`

---

## 3. ERD (Entity Relationship Diagram)

```
┌──────────────────────────────────────────┐
│              users                        │
├──────────────────────────────────────────┤
│ id (PK)                 uuid              │
│ clerk_user_id          text UNIQUE       │
│ email                  text              │
│ name                   text              │
│ profile_image          text              │
│ subscription_tier      text              │
│ free_analysis_count    integer           │
│ monthly_analysis_count integer           │
│ created_at            timestamptz        │
│ updated_at            timestamptz        │
└──────────────────────────────────────────┘
        │                          │
        │ 1                        │ 1
        │                          │
        ├──────────┐               ├───────────┐
        │ *        │               │ 1         │
        ▼          ▼               ▼           ▼
┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  analyses   │  │  subscriptions   │  │    payments      │
├─────────────┤  ├──────────────────┤  ├──────────────────┤
│ id (PK)     │  │ id (PK)          │  │ id (PK)          │
│ user_id (FK)│  │ user_id (FK) UQ  │  │ user_id (FK)     │
│ subject_name│  │ billing_key      │  │ subscription_id  │
│ birth_date  │  │ card_last_4digits│  │ order_id         │
│ birth_time  │  │ card_type        │  │ payment_key      │
│ gender      │  │ subscription_    │  │ amount           │
│ ai_model    │  │   status         │  │ payment_method   │
│ analysis_   │  │ next_payment_date│  │ payment_status   │
│   result    │  │ auto_renewal     │  │ payment_type     │
│ status      │  │ price            │  │ approved_at      │
│ view_count  │  │ cancelled_at     │  │ cancelled_at     │
│ last_viewed │  │ effective_until  │  │ cancel_reason    │
│   _at       │  │ created_at       │  │ retry_count      │
│ created_at  │  │ updated_at       │  │ created_at       │
│ updated_at  │  └──────────────────┘  │ updated_at       │
└─────────────┘           │             └──────────────────┘
                          │ 1
                          │
                          │ *
                          └─────────┐
                                    │
                             (FK: subscription_id)
```

**관계 설명:**
- `users` ↔ `analyses`: 1:N (한 사용자는 여러 분석 이력 보유)
- `users` ↔ `subscriptions`: 1:1 (한 사용자는 최대 1개 구독)
- `users` ↔ `payments`: 1:N (한 사용자는 여러 결제 이력 보유)
- `subscriptions` ↔ `payments`: 1:N (한 구독은 여러 결제 발생)

---

## 4. Trigger 및 자동화

### 4.1 updated_at 자동 갱신 트리거

모든 테이블에 적용되는 `updated_at` 컬럼 자동 갱신 함수

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

각 테이블에 트리거 적용:
```sql
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Cron Job (Supabase)

**정기결제 자동 처리** (매일 02:00 KST)
- 조건: `subscription_status = 'active'`, `next_payment_date = CURRENT_DATE`
- 작업:
  1. 토스페이먼츠 자동결제 API 호출
  2. 성공 시 `payments` INSERT, `subscriptions.next_payment_date` 갱신, `users.monthly_analysis_count = 10`
  3. 실패 시 `retry_count` 증가, 3회 실패 시 `subscription_status = 'suspended'`

---

## 5. 보안 및 제약사항

### 5.1 RLS (Row Level Security)
- **사용 안 함**: 명시적으로 모든 테이블의 RLS 비활성화
- 이유: 백엔드 서버(Hono)에서 service-role 키로 직접 접근

### 5.2 데이터 검증
- `subscription_tier`: CHECK (subscription_tier IN ('free', 'pro'))
- `gender`: CHECK (gender IN ('male', 'female'))
- `status`: CHECK (status IN ('processing', 'completed', 'failed'))
- `subscription_status`: CHECK (subscription_status IN ('active', 'pending_cancellation', 'suspended'))
- `payment_status`: CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled'))

### 5.3 외래 키 제약
- `ON DELETE CASCADE`: 사용자 삭제 시 관련 데이터 모두 삭제
- `ON DELETE SET NULL`: 구독 삭제 시 결제 내역의 `subscription_id`를 NULL로 설정

---

## 6. Migration 전략

### 6.1 Migration 파일 번호
- `0002_create_users_table.sql`: users 테이블 생성
- `0003_create_analyses_table.sql`: analyses 테이블 생성
- `0004_create_subscriptions_table.sql`: subscriptions 테이블 생성
- `0005_create_payments_table.sql`: payments 테이블 생성
- `0006_create_triggers.sql`: updated_at 트리거 생성

### 6.2 Migration 실행 순서
1. `users` (기본 테이블)
2. `analyses` (users 참조)
3. `subscriptions` (users 참조)
4. `payments` (users, subscriptions 참조)
5. Triggers (모든 테이블 대상)

---

## 7. 주요 쿼리 패턴

### 7.1 사용자 분석 이력 조회
```sql
SELECT * FROM analyses
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

### 7.2 구독 상태 확인
```sql
SELECT u.subscription_tier, s.subscription_status, s.next_payment_date
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.clerk_user_id = $1;
```

### 7.3 정기결제 대상 조회 (Cron Job)
```sql
SELECT s.*, u.email, u.name
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.subscription_status = 'active'
  AND s.next_payment_date = CURRENT_DATE
  AND s.billing_key IS NOT NULL;
```

### 7.4 사용자 결제 내역 조회
```sql
SELECT * FROM payments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 10;
```

---

## 8. 데이터 마이그레이션 체크리스트

- [ ] pgcrypto extension 활성화 (`gen_random_uuid()` 사용)
- [ ] RLS 비활성화 확인
- [ ] 모든 테이블에 `updated_at` 트리거 적용
- [ ] 인덱스 생성 확인
- [ ] CHECK 제약조건 적용
- [ ] 외래 키 제약조건 적용
- [ ] Supabase에 migration 파일 적용
- [ ] 테스트 데이터 삽입 및 검증

---

## 9. 참고사항

### 9.1 Clerk Integration
- `users.clerk_user_id`: Clerk Webhook(`user.created`)에서 수신한 ID 저장
- 사용자 정보 동기화: `user.updated` Webhook으로 `email`, `name` 갱신

### 9.2 토스페이먼츠 Integration
- `subscriptions.billing_key`: `/v1/billing/authorizations/issue` API로 발급
- 자동결제: `/v1/billing/{billingKey}` API로 매월 청구
- 결제 취소: `/v1/payments/{paymentKey}/cancel` API로 환불 처리

### 9.3 Gemini API Integration
- `analyses.ai_model`: Free는 `gemini-2.0-flash`, Pro는 `gemini-2.0-pro`
- `analyses.analysis_result`: JSON 형식으로 AI 응답 저장
- Rate Limiting: 분당 최대 5회 요청 (애플리케이션 레벨 제어)

---

## 10. 향후 확장 고려사항 (MVP 이후)

- `notifications` 테이블: 결제 알림, 구독 만료 알림
- `audit_logs` 테이블: 관리자 액션 로깅
- `referrals` 테이블: 추천인 시스템
- `coupons` 테이블: 할인 쿠폰 관리
- `user_preferences` 테이블: 사용자 설정 (테마, 알림 등)
