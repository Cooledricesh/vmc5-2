import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 보호된 라우트 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/analysis(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/subscription(.*)',
]);

// 공개 라우트 정의 (명시적으로 공개)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // 웹훅은 항상 공개
  '/api/public(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // 보호된 라우트에 대해서는 인증 필요
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // 웹훅 엔드포인트는 항상 허용
  if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
    return;
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};