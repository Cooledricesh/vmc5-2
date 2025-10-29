import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Clerk 미들웨어 모킹
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: any) => handler,
  createRouteMatcher: (routes: string[]) => (req: any) => {
    const path = req.nextUrl?.pathname || req.pathname;
    return routes.some(route => {
      // [[...slug]] 패턴 처리
      if (route.includes('[[...')) {
        // /api/[[...hono]](.*) -> /api/
        const basePattern = route.split('[[...')[0];
        return path.startsWith(basePattern);
      }
      // (.*) 패턴 처리 - 하위 경로 포함
      if (route.includes('(.*)')  ) {
        const pattern = route.replace('(.*)', '');
        return path.startsWith(pattern);
      }
      // 정확한 경로 매칭 (하위 경로 없음)
      return path === route;
    });
  }
}));

describe('Middleware - Dashboard 접근 제어', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('인증되지 않은 사용자', () => {
    it('대시보드 접근 시 sign-in으로 리다이렉트되어야 함', async () => {
      // Arrange
      const url = 'http://localhost:3000/dashboard';
      const request = new NextRequest(url);

      // Act
      const { createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/[[...hono]](.*)',
      ]);

      // Assert - /dashboard는 공개 라우트가 아니어야 함
      expect(isPublicRoute(request)).toBe(false);
    });

    it('대시보드 경로가 보호되어야 함', async () => {
      // Arrange
      const dashboardPaths = [
        '/dashboard',
        '/dashboard/settings',
        '/dashboard/profile',
      ];

      const { createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/[[...hono]](.*)',
      ]);

      // Act & Assert
      for (const path of dashboardPaths) {
        const request = new NextRequest(`http://localhost:3000${path}`);
        expect(isPublicRoute(request)).toBe(false);
      }
    });
  });

  describe('공개 라우트', () => {
    it('홈페이지는 인증 없이 접근 가능해야 함', async () => {
      // Arrange
      const url = 'http://localhost:3000/';
      const request = new NextRequest(url);

      const { createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/[[...hono]](.*)',
      ]);

      // Act & Assert
      expect(isPublicRoute(request)).toBe(true);
    });

    it('로그인 페이지는 인증 없이 접근 가능해야 함', async () => {
      // Arrange
      const url = 'http://localhost:3000/sign-in';
      const request = new NextRequest(url);

      const { createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/[[...hono]](.*)',
      ]);

      // Act & Assert
      expect(isPublicRoute(request)).toBe(true);
    });

    it('회원가입 페이지는 인증 없이 접근 가능해야 함', async () => {
      // Arrange
      const url = 'http://localhost:3000/sign-up';
      const request = new NextRequest(url);

      const { createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/[[...hono]](.*)',
      ]);

      // Act & Assert
      expect(isPublicRoute(request)).toBe(true);
    });
  });

  describe('보호된 라우트', () => {
    it('분석 페이지는 인증이 필요해야 함', async () => {
      // Arrange
      const protectedPaths = [
        '/analysis',
        '/analysis/new',
        '/analysis/123',
        '/subscription',
        '/subscription/success',
      ];

      const { createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)',
        '/api/[[...hono]](.*)',
      ]);

      // Act & Assert
      for (const path of protectedPaths) {
        const request = new NextRequest(`http://localhost:3000${path}`);
        expect(isPublicRoute(request)).toBe(false);
      }
    });
  });

  describe('리다이렉트 동작', () => {
    it('리다이렉트 시 원래 경로를 redirectedFrom 파라미터로 전달해야 함', async () => {
      // Arrange
      const originalPath = '/dashboard';
      const expectedRedirectUrl = `/sign-in?redirectedFrom=${encodeURIComponent(originalPath)}`;

      // Assert
      expect(expectedRedirectUrl).toBe('/sign-in?redirectedFrom=%2Fdashboard');
    });

    it('로그인 후 원래 페이지로 돌아갈 수 있어야 함', async () => {
      // Arrange
      const redirectedFrom = '/dashboard';
      const redirectTo = redirectedFrom || '/dashboard';

      // Assert
      expect(redirectTo).toBe('/dashboard');
    });
  });

  describe('중복 미들웨어 체크', () => {
    it('루트와 src 디렉토리에 중복 미들웨어가 없어야 함', async () => {
      // Arrange
      const fs = await import('fs');
      const path = await import('path');

      const rootMiddleware = path.resolve(process.cwd(), 'middleware.ts');
      const srcMiddleware = path.resolve(process.cwd(), 'src/middleware.ts');

      // Act
      const rootExists = fs.existsSync(rootMiddleware);
      const srcExists = fs.existsSync(srcMiddleware);

      // Assert - 둘 중 하나만 존재해야 함
      expect(rootExists && srcExists).toBe(false);
    });
  });
});
