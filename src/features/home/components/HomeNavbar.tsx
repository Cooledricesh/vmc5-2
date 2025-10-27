'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function HomeNavbar() {
  const { isSignedIn } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          사주풀이 AI
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/#features" className="text-sm font-medium hover:text-primary">
            주요 기능
          </Link>
          <Link href="/#pricing" className="text-sm font-medium hover:text-primary">
            요금제
          </Link>
          <Link href="/#faq" className="text-sm font-medium hover:text-primary">
            FAQ
          </Link>

          {isSignedIn ? (
            <Button asChild>
              <Link href="/dashboard">대시보드</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">로그인</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">회원가입</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
