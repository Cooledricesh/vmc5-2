import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useScrollAnimation,
  useMultipleScrollAnimation,
  useScrollProgress,
  useDirectionalAnimation,
} from './useScrollAnimation';

// IntersectionObserver Mock
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  private callback: IntersectionObserverCallback;
  private elements: Set<Element> = new Set();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin || '';
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold || 0];
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // 테스트 헬퍼: 특정 요소에 대한 intersection 트리거
  triggerIntersection(element: Element, isIntersecting: boolean) {
    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    this.callback([entry as IntersectionObserverEntry], this);
  }
}

describe('useScrollAnimation', () => {
  let mockIntersectionObserverCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    mockIntersectionObserverCallback = null;

    // IntersectionObserver를 mock으로 교체
    global.IntersectionObserver = vi.fn((callback, options) => {
      mockIntersectionObserverCallback = callback;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(() => []),
        root: null,
        rootMargin: options?.rootMargin || '',
        thresholds: Array.isArray(options?.threshold)
          ? options.threshold
          : [options?.threshold || 0],
      };
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    mockIntersectionObserverCallback = null;
  });

  // 헬퍼 함수: intersection 시뮬레이션
  const triggerIntersection = (element: Element, isIntersecting: boolean) => {
    if (!mockIntersectionObserverCallback) return;

    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    mockIntersectionObserverCallback(
      [entry as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  };

  describe('🔴 RED: useScrollAnimation - 기본 기능', () => {
    it('ref, isVisible, hasAnimated를 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useScrollAnimation());

      // Assert
      expect(result.current.ref).toBeDefined();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.hasAnimated).toBe(false);
    });

    it('초기 상태에서 isVisible은 false여야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useScrollAnimation());

      // Assert
      expect(result.current.isVisible).toBe(false);
    });

    it('IntersectionObserver가 생성되어야 함', () => {
      // Arrange
      const mockElement = document.createElement('div');

      // Act
      const { result } = renderHook(() => useScrollAnimation());

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Assert - IntersectionObserver 생성자가 호출됨
      expect(IntersectionObserver).toHaveBeenCalled();
    });
  });

  describe('🔴 RED: Intersection 동작', () => {
    it('요소가 뷰포트에 들어오면 isVisible이 true가 되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollAnimation());
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Act
      act(() => {
        triggerIntersection(mockElement, true);
      });

      // Assert
      expect(result.current.isVisible).toBe(true);
      expect(result.current.hasAnimated).toBe(true);
    });

    it('triggerOnce가 true면 한 번 보인 후 다시 숨겨지지 않아야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollAnimation({ triggerOnce: true }));
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Act - 먼저 보이게 함
      act(() => {
        triggerIntersection(mockElement, true);
      });

      expect(result.current.isVisible).toBe(true);

      // Act - 다시 숨김
      act(() => {
        triggerIntersection(mockElement, false);
      });

      // Assert - triggerOnce=true이므로 여전히 visible
      expect(result.current.isVisible).toBe(true);
      expect(result.current.hasAnimated).toBe(true);
    });

    it('triggerOnce가 false면 뷰포트를 벗어나면 다시 숨겨져야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollAnimation({ triggerOnce: false }));
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Act - 먼저 보이게 함
      act(() => {
        triggerIntersection(mockElement, true);
      });

      expect(result.current.isVisible).toBe(true);

      // Act - 다시 숨김
      act(() => {
        triggerIntersection(mockElement, false);
      });

      // Assert - triggerOnce=false이므로 다시 숨겨짐
      expect(result.current.isVisible).toBe(false);
      expect(result.current.hasAnimated).toBe(true);
    });
  });

  describe('🔴 RED: delay 옵션', () => {
    it('delay가 설정되면 지정된 시간 후에 isVisible이 true가 되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollAnimation({ delay: 1000 }));
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Act - intersection 트리거
      act(() => {
        triggerIntersection(mockElement, true);
      });

      // 즉시는 false
      expect(result.current.isVisible).toBe(false);

      // 1000ms 후
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Assert
      expect(result.current.isVisible).toBe(true);
    });

    it('delay 중에 요소가 사라지면 timeout이 취소되어야 함', () => {
      // Arrange
      const { result } = renderHook(() =>
        useScrollAnimation({ delay: 1000, triggerOnce: false })
      );
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Act - intersection 트리거
      act(() => {
        triggerIntersection(mockElement, true);
      });

      // 500ms만 경과
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 요소가 뷰포트를 벗어남
      act(() => {
        triggerIntersection(mockElement, false);
      });

      // 나머지 500ms 경과
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Assert - timeout이 취소되었으므로 여전히 false
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('🔴 RED: cleanup', () => {
    it('unmount 시 timeout이 정리되어야 함', () => {
      // Arrange
      const { result, unmount } = renderHook(() => useScrollAnimation({ delay: 1000 }));
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      act(() => {
        triggerIntersection(mockElement, true);
      });

      // Act - unmount 전에 timeout 체크
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      unmount();

      // Assert - timeout이 정리되었는지 확인
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('🔴 RED: threshold와 rootMargin 옵션', () => {
    it('threshold 옵션이 IntersectionObserver에 전달되어야 함', () => {
      // Arrange
      const mockElement = document.createElement('div');

      // Act
      const { result } = renderHook(() => useScrollAnimation({ threshold: 0.5 }));

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Assert
      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.5 })
      );
    });

    it('rootMargin 옵션이 IntersectionObserver에 전달되어야 함', () => {
      // Arrange
      const mockElement = document.createElement('div');

      // Act
      const { result } = renderHook(() => useScrollAnimation({ rootMargin: '100px' }));

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Assert
      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: '100px' })
      );
    });
  });
});

describe('useMultipleScrollAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.IntersectionObserver = vi.fn((callback, options) => {
      return new MockIntersectionObserver(callback, options);
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('🔴 RED: 여러 애니메이션 관리', () => {
    it('지정된 개수만큼의 애니메이션을 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useMultipleScrollAnimation(3));

      // Assert
      expect(result.current).toHaveLength(3);
      result.current.forEach((animation) => {
        expect(animation.ref).toBeDefined();
        expect(animation.isVisible).toBe(false);
        expect(animation.hasAnimated).toBe(false);
      });
    });

    it('각 애니메이션은 독립적으로 동작해야 함', () => {
      // Arrange
      const { result } = renderHook(() => useMultipleScrollAnimation(2));

      // Assert
      expect(result.current[0].ref).not.toBe(result.current[1].ref);
    });
  });
});

describe('useScrollProgress', () => {
  beforeEach(() => {
    // window 크기 및 스크롤 mock
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3000, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('🔴 RED: 스크롤 진행률 계산', () => {
    it('초기 진행률은 0이어야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useScrollProgress());

      // Assert
      expect(result.current).toBe(0);
    });

    it('스크롤 이벤트에 따라 진행률이 업데이트되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollProgress());

      // Act - 50% 스크롤
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 1000, writable: true });
        window.dispatchEvent(new Event('scroll'));
      });

      // Assert
      expect(result.current).toBe(50);
    });

    it('최대 스크롤 시 진행률은 100이어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollProgress());

      // Act - 100% 스크롤
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 2000, writable: true });
        window.dispatchEvent(new Event('scroll'));
      });

      // Assert
      expect(result.current).toBe(100);
    });

    it('진행률은 0과 100 사이로 제한되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useScrollProgress());

      // Act - 초과 스크롤
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 3000, writable: true });
        window.dispatchEvent(new Event('scroll'));
      });

      // Assert
      expect(result.current).toBeLessThanOrEqual(100);
      expect(result.current).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🔴 RED: cleanup', () => {
    it('unmount 시 scroll 이벤트 리스너가 제거되어야 함', () => {
      // Arrange
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useScrollProgress());

      // Act
      unmount();

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });
});

describe('useDirectionalAnimation', () => {
  let mockIntersectionObserverCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    mockIntersectionObserverCallback = null;

    global.IntersectionObserver = vi.fn((callback, options) => {
      mockIntersectionObserverCallback = callback;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(() => []),
        root: null,
        rootMargin: options?.rootMargin || '',
        thresholds: Array.isArray(options?.threshold)
          ? options.threshold
          : [options?.threshold || 0],
      };
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    mockIntersectionObserverCallback = null;
  });

  // 헬퍼 함수: intersection 시뮬레이션
  const triggerIntersection = (element: Element, isIntersecting: boolean) => {
    if (!mockIntersectionObserverCallback) return;

    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    mockIntersectionObserverCallback(
      [entry as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  };

  describe('🔴 RED: 방향별 애니메이션 클래스', () => {
    it('초기 상태에서 up 방향은 translate-y-10 opacity-0 클래스를 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useDirectionalAnimation('up'));

      // Assert
      expect(result.current.animationClass).toBe('translate-y-10 opacity-0');
    });

    it('초기 상태에서 down 방향은 -translate-y-10 opacity-0 클래스를 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useDirectionalAnimation('down'));

      // Assert
      expect(result.current.animationClass).toBe('-translate-y-10 opacity-0');
    });

    it('초기 상태에서 left 방향은 translate-x-10 opacity-0 클래스를 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useDirectionalAnimation('left'));

      // Assert
      expect(result.current.animationClass).toBe('translate-x-10 opacity-0');
    });

    it('초기 상태에서 right 방향은 -translate-x-10 opacity-0 클래스를 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useDirectionalAnimation('right'));

      // Assert
      expect(result.current.animationClass).toBe('-translate-x-10 opacity-0');
    });

    it('visible 상태에서는 translate-x-0 translate-y-0 opacity-100 클래스를 반환해야 함', () => {
      // Arrange
      const { result } = renderHook(() => useDirectionalAnimation('up'));
      const mockElement = document.createElement('div');

      act(() => {
        (result.current.ref as React.MutableRefObject<HTMLElement>).current = mockElement;
      });

      // Act
      act(() => {
        triggerIntersection(mockElement, true);
      });

      // Assert
      expect(result.current.isVisible).toBe(true);
      expect(result.current.animationClass).toBe('translate-x-0 translate-y-0 opacity-100');
    });
  });

  describe('🔴 RED: ref와 isVisible 반환', () => {
    it('ref와 isVisible을 반환해야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useDirectionalAnimation('up'));

      // Assert
      expect(result.current.ref).toBeDefined();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.animationClass).toBeDefined();
    });
  });
});
