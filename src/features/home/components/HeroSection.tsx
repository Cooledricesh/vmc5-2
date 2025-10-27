'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const { isSignedIn } = useAuth();

  return (
    <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 text-center">
        <motion.h1
          className="text-5xl md:text-6xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          AI가 분석하는
          <br />
          <span className="text-primary">정확한 사주팔자</span>
        </motion.h1>

        <motion.p
          className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Google Gemini AI를 활용한 전통 사주팔자 분석.
          <br />
          천간지지, 오행분석부터 대운/세운까지 상세하게 알려드립니다.
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {isSignedIn ? (
            <Button size="lg" asChild>
              <Link href="/analysis/new">분석 시작하기</Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link href="/sign-up">무료로 시작하기</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-in">로그인</Link>
              </Button>
            </>
          )}
        </motion.div>

        <motion.p
          className="text-sm text-gray-500 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          회원가입 시 무료 분석 3회 제공
        </motion.p>
      </div>
    </section>
  );
}
