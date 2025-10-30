import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 공개 라우트 정의 (인증 없이 접근 가능)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/[[...hono]](.*)",  // Hono API 라우트
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const path = req.nextUrl.pathname;

  // ✅ Supabase 인증 페이지는 더 이상 사용하지 않으므로 Clerk 페이지로 리다이렉트
  if (path === '/login' || path === '/signup') {
    const clerkPath = path === '/login' ? '/sign-in' : '/sign-up';
    const clerkUrl = new URL(clerkPath, req.url);
    // redirectedFrom 파라미터가 있으면 유지
    const redirectedFrom = req.nextUrl.searchParams.get('redirectedFrom');
    if (redirectedFrom) {
      clerkUrl.searchParams.set('redirectedFrom', redirectedFrom);
    }
    return NextResponse.redirect(clerkUrl);
  }

  // 로그인한 사용자가 로그인/회원가입 페이지에 접근하려 할 때
  if (userId) {
    if (path === '/sign-in' || path === '/sign-up') {
      const redirectTo = req.nextUrl.searchParams.get('redirectedFrom') || '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
  }

  // 로그인하지 않은 사용자가 보호된 라우트에 접근하려 할 때
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};