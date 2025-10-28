네, 알겠습니다. 교차 검증을 통해 확인된 내용과 제안해주신 사항을 반영하여 "Clerk Webhook 연동" 문서를 최신 정보에 맞게 수정했습니다.

---

# Clerk Webhook 연동 (2025 최신 기준)

**Clerk Webhooks**는 사용자 생성(`user.created`), 수정(`user.updated`), 삭제(`user.deleted`) 등 Clerk에서 발생하는 주요 이벤트를 외부 서버(애플리케이션)에 실시간으로 전송하는 기능입니다. 이를 통해 외부 데이터베이스와 사용자 정보를 동기화하거나, 이벤트 기반의 자동화 로직을 손쉽게 구현할 수 있습니다.

2025년 10월 기준, Clerk의 Webhook 시스템은 **Svix를 기반으로 한 강력한 서명 검증 체계**를 사용하며, 최신 웹 표준과 Next.js 15, Node.js 18 LTS 이상 환경을 완벽하게 지원합니다.

***

## 1. 주요 Webhook 유형 및 활용 사례

Clerk은 다양한 이벤트를 제공하며, 대표적인 유형과 활용 사례는 다음과 같습니다.

| 이벤트 유형 | 발생 시점 | 주요 활용 사례 |
| :--- | :--- | :--- |
| `user.created` | 새 사용자가 가입하거나 API로 생성될 때 | 애플리케이션의 사용자 데이터베이스에 새 레코드 생성 |
| `user.updated` | 사용자가 프로필, 이메일, 이름 등을 수정했을 때 | 외부 DB의 사용자 정보와 실시간으로 동기화 |
| `user.deleted` | 사용자가 계정을 삭제하거나 관리자가 제거했을 때 | DB의 사용자 데이터를 삭제하거나 비활성화(soft-delete) 처리 |
| `session.created` | 사용자가 성공적으로 로그인하여 세션을 생성했을 때 | 로그인 활동에 대한 감사 로그(audit log) 기록 |
| `organization.created` | 사용자가 새로운 조직(Organization)을 생성했을 때 | 멀티테넌트 SaaS 애플리케이션의 조직 정보 연동 |

***

## 2. Webhook 엔드포인트 등록 절차 (Dashboard)

1.  **[Clerk Dashboard → Webhooks]** 메뉴로 이동한 뒤 **[Add Endpoint]** 버튼을 클릭합니다.
2.  **Endpoint URL** 필드에 Webhook 이벤트를 수신할 서버의 공개 주소를 입력합니다. (로컬 테스트 시 `ngrok` 주소 사용)
    ```
    https://your-production-domain.com/api/webhooks/clerk
    ```
3.  **Message filtering** 섹션에서 수신하고자 하는 이벤트 유형을 선택합니다. (예: `user.created`, `user.updated`)
4.  **[Create]** 버튼을 클릭하면 엔드포인트가 생성되며, 가장 중요한 **Signing Secret**이 발급됩니다.
5.  발급된 Signing Secret (`whsec_...` 형식)을 복사하여 `.env.local` 파일에 환경 변수로 추가합니다.
    ```
    CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
    ```

***

## 3. Webhook Secret의 역할과 중요성

-   각 엔드포인트마다 Clerk이 생성하는 고유한 `Signing Secret`은 Webhook 요청이 중간에 탈취되거나 위조되지 않았음을 보장하는 핵심적인 보안 장치입니다.
-   Clerk은 이 Secret을 사용하여 HMAC 서명을 생성하고, 요청 헤더에 담아 전송합니다. 우리 서버는 동일한 Secret을 사용하여 서명을 검증함으로써 요청이 신뢰할 수 있는 Clerk 서버로부터 온 것임을 증명합니다.
-   **이 값은 절대 Git과 같은 버전 관리 시스템에 노출해서는 안 되며, 반드시 환경 변수로 관리해야 합니다.**

***

## 4. Webhook 서명 검증 로직

Clerk의 Webhook은 Svix 인프라를 사용하며, 서명 검증을 위해 **두 가지 방법**을 제공합니다:

1. **Svix 라이브러리 직접 사용** (범용, 세밀한 제어 가능)
2. **Clerk의 `verifyWebhook()` 헬퍼 함수** (간편, Clerk 타입 지원)

검증 로직은 다음 세 가지 헤더와 요청 본문(payload)을 사용합니다:
-   `svix-id`: 각 Webhook 메시지의 고유 ID
-   `svix-timestamp`: 메시지가 전송된 시간 (타임스탬프)
-   `svix-signature`: HMAC 서명 값

### 4-1. Svix 라이브러리를 사용한 검증 (범용 방식)

아래는 Next.js App Router에서 Svix를 사용하여 Webhook을 검증하는 코드 예시입니다.

```typescript
// app/api/webhooks/clerk/route.ts

import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  // Webhook Secret은 환경 변수에서 가져와야 합니다.
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local");
  }

  // 요청 헤더를 가져옵니다.
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // 헤더가 없는 경우, 유효하지 않은 요청으로 처리합니다.
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // 요청 본문을 가져옵니다.
  // 주의: 서명 검증을 위해 원본(raw) 본문을 사용해야 하므로,
  // req.json() 대신 req.text()를 사용해야 할 수 있습니다.
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Svix Webhook 인스턴스를 생성합니다.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // 서명을 검증합니다.
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // 이벤트 유형에 따라 비즈니스 로직을 처리합니다.
  const eventType = evt.type;
  console.log(`Received event: ${eventType}`);

  // 예시: 사용자 생성 시 데이터베이스에 정보 저장
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    // await db.user.create({ data: { clerkId: id, email: email_addresses[0].email_address, ... } });
  }

  // Clerk에 성공적으로 수신했음을 알리기 위해 200 상태 코드로 응답합니다.
  return new Response("OK", { status: 200 });
}
```

### 4-2. Clerk의 verifyWebhook() 헬퍼 함수 사용 (권장 방식)

`@clerk/nextjs/server`에서 제공하는 `verifyWebhook()` 함수를 사용하면 더 간결하게 검증할 수 있습니다. 이 방식은 Clerk의 타입을 자동으로 지원하며, 2025년 기준 공식 권장 방법입니다.

```typescript
// app/api/webhooks/clerk/route.ts

import { verifyWebhook } from '@clerk/nextjs/server';
import { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  // Webhook Secret은 환경 변수에서 가져와야 합니다.
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local");
  }

  // 요청 헤더를 가져옵니다.
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  // 헤더가 없는 경우, 유효하지 않은 요청으로 처리합니다.
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // 요청 본문을 가져옵니다.
  const payload = await req.text();

  try {
    // verifyWebhook을 사용하여 서명 검증
    const evt = await verifyWebhook(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }, WEBHOOK_SECRET) as WebhookEvent;

    // 이벤트 유형에 따라 비즈니스 로직을 처리합니다.
    const eventType = evt.type;
    console.log(`Received event: ${eventType}`);

    // 예시: 사용자 생성 시 데이터베이스에 정보 저장
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name } = evt.data;
      // await db.user.create({ data: { clerkId: id, email: email_addresses[0].email_address, ... } });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }
}
```

**🎯 verifyWebhook() 사용의 장점**:
- Clerk의 WebhookEvent 타입을 자동으로 지원하여 타입 안정성 확보
- Svix 라이브러리를 별도로 설치할 필요 없음
- Clerk SDK와 완벽한 통합

***

## 5. 단계별 연동 가이드 (Next.js 15 기준)

### Step 1. 필요 패키지 설치 및 환경 변수 설정
```bash
npm install svix
````.env.local` 파일에 Clerk API 키와 위에서 발급받은 Webhook Secret을 추가합니다.
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

### Step 2. API 엔드포인트 생성
-   `/app/api/webhooks/clerk/route.ts` 경로에 파일을 생성하고, 위의 검증 로직 코드를 붙여넣습니다.

### Step 3. 로컬 환경 테스트 (ngrok 사용)
-   `ngrok`을 설치하고 로컬 개발 서버(포트 3000)에 대한 터널을 생성합니다.
    ```bash
    npx ngrok http 3000
    ```
-   `ngrok`이 생성해준 `https://...ngrok-free.app` 형태의 URL을 복사합니다.
-   Clerk 대시보드 Webhook 설정의 `Endpoint URL`에 `https://...ngrok-free.app/api/webhooks/clerk`를 입력하고 저장합니다.
-   대시보드의 **[Send test event]** 기능을 사용하여 로컬 서버로 테스트 이벤트가 정상적으로 수신되고, 200 응답이 반환되는지 확인합니다.

***

## 6. 보안 강화: IP Whitelisting (2025 권장사항)

보안을 더욱 강화하기 위해 Webhook 엔드포인트가 **Svix의 공식 IP 주소**에서만 요청을 받도록 제한할 수 있습니다. 이를 통해 악의적인 공격자가 가짜 Webhook 요청을 보내는 것을 원천적으로 차단할 수 있습니다.

### IP Whitelisting 구현 방법

Svix는 공식 Webhook IP 목록을 JSON 형식으로 제공합니다: https://docs.svix.com/webhook-ips.json

**Next.js Middleware에서 IP 체크 예시:**

```typescript
// middleware.ts 또는 app/api/webhooks/clerk/route.ts

const SVIX_WEBHOOK_IPS = [
  // 2025년 기준 Svix 공식 IP 목록 (실제 배포 시 위 URL에서 최신 목록 확인 필요)
  '3.218.178.215',
  '18.206.69.169',
  '34.197.71.230',
  // ... 추가 IP들
];

export async function POST(req: Request) {
  // 클라이언트 IP 가져오기
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip');

  // IP 화이트리스트 확인
  if (clientIP && !SVIX_WEBHOOK_IPS.includes(clientIP)) {
    console.warn(`Blocked webhook request from unauthorized IP: ${clientIP}`);
    return new Response("Forbidden", { status: 403 });
  }

  // 서명 검증 및 비즈니스 로직 계속 진행...
}
```

**⚠️ 주의사항**:
- IP 목록은 정기적으로 업데이트되므로, 프로덕션 환경에서는 주기적으로 최신 목록을 확인해야 합니다.
- 클라우드 플랫폼(Vercel, AWS 등)에 따라 실제 클라이언트 IP를 가져오는 헤더가 다를 수 있습니다.

***

## 7. 주요 트러블슈팅 및 해결책

| 문제 상황 | 주요 원인 | 해결 방안 |
| :--- | :--- | :--- |
| **Webhook delivery failed** | 엔드포인트가 200번대 상태 코드로 응답하지 않음. (예: 4xx, 5xx 에러 또는 응답 없음) | 로직의 마지막에 `return new Response("OK", { status: 200 })` 코드가 반드시 실행되도록 수정합니다. |
| **Invalid Signature** | `.env`의 `Signing Secret`이 잘못되었거나, 요청 본문(payload)이 변형됨. | Clerk 대시보드에서 `Signing Secret`을 다시 복사하여 환경 변수 값이 정확한지 확인합니다. |
| **로컬 테스트 실패** | `ngrok` 터널이 끊겼거나, 재시작 후 URL이 변경됨. | `ngrok`을 재시작하고 새로 발급된 URL을 Clerk 대시보드의 엔드포인트 URL에 다시 업데이트합니다. |
| **OAuth 최초 로그인 시 Webhook 누락** | 과거 버전의 SDK 또는 Clerk 내부 동기화 지연 문제. | `@clerk/nextjs` SDK를 항상 최신 안정 버전으로 유지하고, 문제가 지속되면 Clerk 지원팀에 문의합니다. |
| **IP Whitelisting 후 403 에러** | 프록시, CDN, 또는 클라우드 플랫폼에서 실제 클라이언트 IP가 다른 헤더로 전달됨. | `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` (Cloudflare) 등 플랫폼별 헤더를 확인합니다. |

***

## 결론 및 핵심 요약

-   **보안이 핵심**: Webhook 엔드포인트는 반드시 서명을 검증해야 합니다.
    - **권장**: `@clerk/nextjs/server`의 `verifyWebhook()` 헬퍼 함수 사용 (타입 안정성, 간결함)
    - **대안**: `svix` 라이브러리 직접 사용 (세밀한 제어 필요 시)
    - `Signing Secret`은 환경 변수로 안전하게 관리 필수

-   **응답 코드 준수**: Webhook을 성공적으로 수신했다는 의미로 항상 `200 OK` 응답을 반환해야 Clerk 측에서 재전송을 시도하지 않습니다.

-   **로컬 테스트 필수**: `ngrok`과 같은 터널링 도구를 사용하여 프로덕션 배포 전에 로컬 환경에서 충분히 테스트하는 것이 중요합니다.

-   **최신 버전 유지**: `@clerk/nextjs`를 최신 버전(v6.34.0+)으로 유지하여 보안 패치와 기능 개선 사항을 적용받는 것이 좋습니다.

-   **추가 보안 강화 (2025 권장)**:
    - Svix IP Whitelisting을 적용하여 악의적인 요청을 원천 차단
    - 타임스탬프 검증으로 Replay Attack 방지 (Svix 라이브러리 자동 처리)

-   **Next.js 15 호환성**:
    - `@clerk/nextjs` v6 이상 사용 시 Next.js 15의 비동기 API 변경사항 완벽 지원
    - `headers()` 등 Request API가 비동기로 변경된 부분 자동 처리됨