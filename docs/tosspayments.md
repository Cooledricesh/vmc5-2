## ✅ 토스페이먼츠 SDK 구현 가이드 (v2, 2025년 LTS 기준)

### 1. SDK 설치
**NPM 설치 (웹 프로젝트, Next.js 포함)**  
```bash
npm install @tosspayments/tosspayments-sdk --save
```

**CDN 방식**
```html
<script src="https://cdn.tosspayments.com/v2/sdk"></script>
```

- 현재 최신 버전: **SDK v2 (2024.12 출시)**  
- SDK v1은 더 이상 유지보수되지 않음  
- LTS 적용된 SDK v2는 **Next.js 14~15** 호환성이 확인됨[1]

***

### 2. SDK 초기화 및 사용

**1) 기본 구조**
```typescript
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
const payment = tossPayments.payment({ customerKey: '고객고유ID' });
```

**2) requestBillingAuth() 예시**
```typescript
await payment.requestBillingAuth({
  method: 'CARD',
  successUrl: `${window.location.origin}/billing/success`,
  failUrl: `${window.location.origin}/billing/fail`,
  customerName: '홍길동',
  customerEmail: 'user@example.com',
});
```
- `successUrl`로 리다이렉트 시 `authKey`와 `customerKey`를 쿼리로 전달받음  
- 이 `authKey`를 서버 API로 넘겨 **빌링키 발급 API** 호출[9][1]

***

## ✅ 토스페이먼츠 API 구현 가이드 (v1)

### 1. 공통 설정

| 항목 | 값 |
|------|------|
| **Base URL** | `https://api.tosspayments.com/v1` |
| **인증 방식** | Basic Auth (`SecretKey:` Base64 인코딩) |
| **헤더** | `Authorization: Basic {encoded_key}`, `Content-Type: application/json` |
| **API 버전** | `v1` (2025년 10월 기준 최신) [2][5] |

**SecretKey 인코딩 주의**  
```typescript
const encodedKey = Buffer.from(secretKey + ':').toString('base64');
```

***

### 2. 주요 API 엔드포인트

#### (1) 빌링키 발급 API
```
POST /billing/authorizations/issue
```

**요청 예시**
```json
{
  "authKey": "success_url_에서_받은_authKey",
  "customerKey": "고객고유ID"
}
```

**응답 예시**
```json
{
  "billingKey": "abc123XYZ==",
  "customerKey": "고객고유ID",
  "method": "카드",
  "card": {
    "issuerCode": "61",
    "number": "123456******7890",
    "cardType": "신용"
  }
}
```

- `authKey`는 **일회성**이며 재사용 불가  
- 성공 시 반환된 `billingKey`는 DB에 반드시 저장[5][9]

***

#### (2) 자동결제 승인 API
```
POST /billing/{billingKey}
```

**요청 예시**
```json
{
  "customerKey": "고객고유ID",
  "amount": 9900,
  "orderId": "SUBSCRIPTION_20251025_001",
  "orderName": "Pro 요금제 구독료",
  "customerEmail": "user@example.com",
  "customerName": "홍길동"
}
```

**응답 예시**
```json
{
  "paymentKey": "pay_1234567890",
  "orderId": "SUBSCRIPTION_20251025_001",
  "status": "DONE",
  "approvedAt": "2025-10-25T15:45:00+09:00"
}
```

- 결제 완료 시 `status: DONE`  
- 실패 시 에러코드 및 메시지가 JSON으로 반환됨

***

#### (3) 결제 취소 API
```
POST /payments/{paymentKey}/cancel
```
**요청**
```json
{ "cancelReason": "고객 구독 해지" }
```
**응답**
```json
{ "cancelAmount": 9900, "status": "CANCELED" }
```

***

### 3. API 호출 예제 (Next.js 서버)
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { authKey, customerKey } = await request.json();
  const encodedKey = Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64');

  const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodedKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ authKey, customerKey })
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```
- 서버단에서 `authKey`로 빌링키를 발급하고 저장  
- 고객의 `billingKey`를 이후 `/billing/{billingKey}`로 결제 트리거링[2][5]

***

### 4. 참고 자료
- **SDK 공식 문서**: https://docs.tosspayments.com/sdk/v2/js  
- **API 레퍼런스**: https://docs.tosspayments.com/reference  
- **개발자 커뮤니티**: https://techchat.tosspayments.com  
- **샘플 프로젝트 (GitHub)**: https://github.com/tosspayments/tosspayments-sample[3]

***

요약하자면,  
- SDK는 프론트엔드에서 결제 인증 및 `authKey` 발급용 UI를 담당하고,  
- API는 서버에서 해당 `authKey`를 교환하여 `billingKey`를 발급하고,  
- 이후 자동결제(`POST /billing/{billingKey}`) 및 취소(`POST /payments/{paymentKey}/cancel`)를 관리합니다.  

이 버전은 2025년 10월 기준 **최신 공식 문서와 동일한 엔드포인트 및 인증규칙**을 반영했습니다.
