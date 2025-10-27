import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  // 공개 라우트 설정 (인증 없이 접근 가능)
  publicRoutes: [
    "/",
    "/api/webhooks(.*)",
    "/signup",  // 기존 Supabase signup 페이지 (추후 마이그레이션 예정)
    "/login",   // 기존 Supabase login 페이지 (추후 마이그레이션 예정)
  ],

  // 무시할 라우트 (middleware가 실행되지 않음)
  ignoredRoutes: [
    "/((?!api|trpc))(_next.*|.+\\.[\\w]+$)",
    "/api/[[...hono]]",  // Hono API 라우트는 자체 인증 처리
  ],

  afterAuth(auth, req) {
    // 로그인하지 않은 사용자가 보호된 라우트에 접근하려 할 때
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // 로그인한 사용자가 로그인/회원가입 페이지에 접근하려 할 때
    if (auth.userId) {
      const path = req.nextUrl.pathname;
      if (path === '/sign-in' || path === '/sign-up' || path === '/login' || path === '/signup') {
        const redirectTo = req.nextUrl.searchParams.get('redirectedFrom') || '/dashboard';
        return NextResponse.redirect(new URL(redirectTo, req.url));
      }
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};