'use client';

import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

interface UseScrollAnimationReturn {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  hasAnimated: boolean;
}

/**
 * Intersection Observer를 활용한 스크롤 애니메이션 훅
 * @param options - 애니메이션 옵션
 * @returns ref, isVisible, hasAnimated 상태
 */
export function useScrollAnimation(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn {
  const {
    threshold = 0.2,
    rootMargin = '0px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldShow = entry.isIntersecting;

        if (shouldShow) {
          // 지연 시간이 있으면 타임아웃 설정
          if (delay > 0) {
            timeoutRef.current = setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
          } else {
            setIsVisible(true);
            setHasAnimated(true);
          }

          // triggerOnce가 true면 한 번만 실행
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else {
          // triggerOnce가 false면 요소가 뷰포트를 벗어날 때 다시 숨김
          if (!triggerOnce) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setIsVisible(false);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce, delay]);

  return {
    ref: ref as React.RefObject<HTMLElement>,
    isVisible,
    hasAnimated,
  };
}

/**
 * 여러 요소에 대한 스크롤 애니메이션을 관리하는 훅
 * @param count - 관리할 요소의 개수
 * @param options - 애니메이션 옵션
 * @returns 각 요소에 대한 ref와 visibility 상태 배열
 */
export function useMultipleScrollAnimation(
  count: number,
  options: UseScrollAnimationOptions = {}
) {
  const animations = Array.from({ length: count }, () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useScrollAnimation(options)
  );

  return animations;
}

/**
 * 스크롤 위치에 따른 진행률을 계산하는 훅
 * @returns 현재 스크롤 진행률 (0-100)
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const maxScroll = documentHeight - windowHeight;

      if (maxScroll > 0) {
        const currentProgress = (scrollTop / maxScroll) * 100;
        setProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 초기값 설정

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return progress;
}

/**
 * 특정 방향에서 요소가 나타나는 애니메이션을 위한 훅
 * @param direction - 애니메이션 방향
 * @param options - 애니메이션 옵션
 * @returns ref와 애니메이션 클래스
 */
export function useDirectionalAnimation(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  options: UseScrollAnimationOptions = {}
) {
  const { ref, isVisible } = useScrollAnimation(options);

  const getAnimationClass = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return 'translate-y-10 opacity-0';
        case 'down':
          return '-translate-y-10 opacity-0';
        case 'left':
          return 'translate-x-10 opacity-0';
        case 'right':
          return '-translate-x-10 opacity-0';
        default:
          return 'opacity-0';
      }
    }
    return 'translate-x-0 translate-y-0 opacity-100';
  };

  return {
    ref,
    isVisible,
    animationClass: getAnimationClass(),
  };
}