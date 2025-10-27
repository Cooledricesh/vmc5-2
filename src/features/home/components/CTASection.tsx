'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function CTASection() {
  const { isSignedIn } = useAuth();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-20 bg-white">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Google 계정으로 간편하게 가입하고
            <br />
            AI가 분석하는 정확한 사주팔자를 경험해보세요
          </p>
          <Button size="lg" asChild>
            <Link href={isSignedIn ? '/analysis/new' : '/sign-up'}>
              {isSignedIn ? '분석 시작하기' : '무료로 시작하기'}
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
