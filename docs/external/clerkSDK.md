# Clerk Next.js SDK 연동: 최신(2025 기준) 공식 및 실무 가이드

**최신 Clerk Next.js SDK(@clerk/nextjs v6 이상)를 기준으로, 공식 문서, 실전 경험, 최신 커뮤니티 논의를 종합하여 Next.js(App Router) 프로젝트에 Clerk 인증을 연동하는 방법과 주요 주의사항을 안내합니다.**

***

## 1. 사전 준비 및 요구사항

- **Node.js 18.17.0 이상**
- **React 18 이상**
- **Next.js 13.5.7 이상 (v14 및 v15 완전 지원)**
- **Clerk.com 회원가입 및 Application 생성(대시보드 접근)**
  Clerk 대시보드에서 로그인/회원가입 후 새 애플리케이션을 생성하고 API 키를 취득해야 합니다.

***

## 2. Clerk SDK 설치

터미널에서 프로젝트 폴더로 이동 후 최신 SDK를 설치합니다.

```bash
npm install @clerk/nextjs
```
또는
```bash
yarn add @clerk/nextjs
```

***

## 3. 환경 변수(.env.local) 세팅

Clerk 대시보드에서 아래 키들을 복사하여 프로젝트 루트의 `.env.local` 파일에 추가합니다.

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<대시보드에서 받은 값>
CLERK_SECRET_KEY=<대시보드에서 받은 값>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
```

**TIP:** 실제 프로덕션 환경에서는 Clerk 대시보드에서 개발(Development)과 운영(Production) 환경을 분리하고, 각 환경에 맞는 API 키를 사용하여 관리하는 것이 필수적입니다.

***

## 4. ClerkProvider 적용 (app/layout.tsx)

`app/layout.tsx` 파일에서 전체 애플리케이션 컴포넌트를 `<ClerkProvider>`로 감싸 Clerk의 인증 컨텍스트를 전역으로 제공해야 합니다.

```tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ko">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

***

## 5. Middleware 설정 (middleware.ts)

Next.js App Router 프로젝트의 루트 디렉터리(또는 `src/`)에 `middleware.ts` 파일을 생성하고 모든 라우트를 보호하도록 설정합니다. 이는 Clerk 연동의 핵심 단계입니다.

```ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**TIP:** `clerkMiddleware`의 인자로 `{ publicRoutes: ["/"], ignoredRoutes: ["/api/public"] }` 와 같이 객체를 전달하여 특정 경로는 인증 없이 접근할 수 있도록 설정할 수 있습니다.

***

## 6. 인증 페이지 구성 (라우트 기반 생성)

Clerk이 제공하는 내장 UI 컴포넌트를 사용해 로그인 및 회원가입 페이지를 손쉽게 구성할 수 있습니다. `app` 디렉터리 아래에 다음과 같은 폴더와 파일을 생성합니다.

- `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx`

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx 예시
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return <SignIn />;
}
```

동일한 방식으로 `<SignUp />`, `<UserProfile />`, `<OrganizationProfile />` 등 Clerk이 제공하는 다양한 컴포넌트를 활용할 수 있습니다.

***

## 7. 인증된 사용자만 접근 가능한 경로 예시

서버 컴포넌트에서 사용자의 인증 상태를 확인하려면 Clerk의 `auth()` 헬퍼 함수를 사용합니다. **`@clerk/nextjs` v6부터 `auth()` 함수는 비동기(async) 방식으로 변경되었으므로, 반드시 `await` 키워드와 함께 사용해야 합니다.**

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth(); // await 키워드 사용 필수

  if (!userId) {
    // 사용자가 로그인하지 않았다면 로그인 페이지로 리디렉션
    return redirect("/sign-in");
  }

  // 로그인한 사용자를 위한 대시보드 UI 렌더링
  return (
    <div>
      <h1>Welcome to your Dashboard!</h1>
      <p>Your User ID is: {userId}</p>
    </div>
  );
}
```

***

## 8. 주요 트러블슈팅과 실제 발생 사례

- **middleware.ts 또는 ClerkProvider 누락 시 인증 불가/500 에러 발생**: 이 두 파일의 설정은 Clerk 연동의 필수 요소이므로, 문제가 발생하면 가장 먼저 확인해야 합니다.
- **Next.js 15.x `headers()` 관련 호환성 이슈**: Next.js 15의 안정 버전부터 `headers()` API가 비동기로 변경되면서, 레이아웃에서 ClerkProvider를 사용할 때 `headers()` 관련 오류가 발생할 수 있습니다. `@clerk/nextjs` v6에서 이 문제에 대한 지원이 추가되었습니다.
- **서버 인증 및 SSR 세션 미작동 문제**: 클라우드 환경의 커스텀 도메인(특히 Production)에서 서버 사이드 인증이 예상대로 동작하지 않는 사례가 커뮤니티에 보고되었습니다. 개발 완료 후 실제 운영 환경과 동일한 조건에서 충분한 테스트가 필수적입니다.
- **Clerk API 응답 속도 및 안정성 문제**: Reddit 등 커뮤니티에서 간헐적인 다운타임, API 응답 지연, 이메일 전송 지연 등의 문제가 제기된 바 있습니다. 중요한 프로덕션 환경에 적용하기 전, Clerk의 서비스 수준 협약(SLA)을 확인하고, 필요시 대체 인증 솔루션을 함께 고려하는 것이 좋습니다.

***

## 9. 최신 안정 버전 정보 (2025년 10월 기준)

- **`@clerk/nextjs` SDK**: **최신 안정 버전(v6.x 이상) 사용을 권장합니다.**
    - `v5.0.0`부터 주요 기능 세트인 "Core 2"가 포함되었습니다.
    - Clerk은 별도의 LTS 버전을 지정하기보다 최신 버전을 사용하도록 권장하며, 이전 메이저 버전에 대해서는 1년간 보안 업데이트를 지원합니다.
- **React**: 18.x 이상
- **Next.js**: 13.5.7 이상, 최신 15.x 버전을 완벽히 지원합니다.

***

## 한글/영문 Step-by-step 요약

1.  **Sign up & Get Keys**: Clerk.com에 가입하고 새 애플리케이션을 생성한 뒤, 대시보드에서 API 키를 발급받습니다.
2.  **Install SDK**: `npm install @clerk/nextjs` 명령어로 최신 SDK를 설치합니다.
3.  **Set Env Vars**: `.env.local` 파일에 발급받은 API 키를 등록합니다.
4.  **Add Provider**: `/app/layout.tsx`의 최상단을 `<ClerkProvider>`로 감싸줍니다.
5.  **Configure Middleware**: `/middleware.ts` 파일을 생성하고 `clerkMiddleware`를 설정하여 라우트를 보호합니다.
6.  **Create Auth Pages**: `/sign-in`, `/sign-up` 등 인증 관련 페이지를 생성하고 Clerk UI 컴포넌트를 배치합니다.
7.  **Check Auth State**: 필요한 컴포넌트에서 `await auth()`와 같은 헬퍼 함수를 사용해 로그인 상태를 확인하고 사용자 정보를 활용합니다.
8.  **Verify in Production**: 프로덕션 배포 시에는 API 키 분리, 커스텀 도메인 설정, SSR 메커니즘을 반드시 실환경에서 검증합니다.