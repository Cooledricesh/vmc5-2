import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToast, toast } from './use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('🔴 RED: useToast hook - 기본 기능', () => {
    it('초기 상태는 빈 toasts 배열이어야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useToast());

      // Assert
      expect(result.current.toasts).toEqual([]);
    });

    it('toast 함수가 정의되어 있어야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useToast());

      // Assert
      expect(result.current.toast).toBeDefined();
      expect(typeof result.current.toast).toBe('function');
    });

    it('dismiss 함수가 정의되어 있어야 함', () => {
      // Arrange & Act
      const { result } = renderHook(() => useToast());

      // Assert
      expect(result.current.dismiss).toBeDefined();
      expect(typeof result.current.dismiss).toBe('function');
    });
  });

  describe('🔴 RED: toast 함수 - toast 추가', () => {
    it('toast를 추가하면 toasts 배열에 포함되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      // Act
      act(() => {
        result.current.toast({
          title: '테스트 제목',
          description: '테스트 설명',
        });
      });

      // Assert
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('테스트 제목');
      expect(result.current.toasts[0].description).toBe('테스트 설명');
    });

    it('toast는 고유한 ID를 가져야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      // Act
      let firstId: string;
      act(() => {
        const toastResult = result.current.toast({ title: 'Toast 1' });
        firstId = toastResult.id;
      });

      // Assert
      expect(firstId!).toBeDefined();
      expect(typeof firstId!).toBe('string');
      expect(result.current.toasts[0].id).toBe(firstId!);
    });

    it('toast는 기본적으로 open 상태여야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      // Act
      act(() => {
        result.current.toast({ title: '테스트' });
      });

      // Assert
      expect(result.current.toasts[0].open).toBe(true);
    });

    it('TOAST_LIMIT(1)을 초과하면 가장 오래된 toast는 제거되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      // Act
      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });
      act(() => {
        result.current.toast({ title: 'Toast 2' });
      });

      // Assert
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 2');
    });
  });

  describe('🔴 RED: standalone toast 함수', () => {
    it('전역 toast 함수를 사용해도 hook에서 확인 가능해야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      // Act
      act(() => {
        toast({ title: '전역 Toast' });
      });

      // Assert
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('전역 Toast');
    });

    it('toast 함수는 id, dismiss, update 메서드를 반환해야 함', () => {
      // Arrange & Act
      let toastResult: { id: string; dismiss: () => void; update: (props: any) => void };

      act(() => {
        toastResult = toast({ title: '테스트' });
      });

      // Assert
      expect(toastResult!).toBeDefined();
      expect(toastResult!.id).toBeDefined();
      expect(typeof toastResult!.dismiss).toBe('function');
      expect(typeof toastResult!.update).toBe('function');
    });
  });

  describe('🔴 RED: dismiss 기능', () => {
    it('특정 toast를 dismiss하면 open이 false가 되어야 함', async () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: '테스트' });
      });

      const toastId = result.current.toasts[0].id;

      // Act
      act(() => {
        result.current.dismiss(toastId);
      });

      // Assert
      expect(result.current.toasts[0].open).toBe(false);
    });

    it('toast ID 없이 dismiss하면 모든 toast의 open이 false가 되어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      // Act
      act(() => {
        result.current.dismiss();
      });

      // Assert
      result.current.toasts.forEach((t) => {
        expect(t.open).toBe(false);
      });
    });

    it('dismiss된 toast는 TOAST_REMOVE_DELAY 후 제거되어야 함', async () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: '테스트' });
      });

      const toastId = result.current.toasts[0].id;

      // Act
      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts).toHaveLength(1);

      // TOAST_REMOVE_DELAY = 1000000ms
      await act(async () => {
        vi.advanceTimersByTime(1000000);
      });

      // Assert
      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('🔴 RED: update 기능', () => {
    it('toast의 update 메서드로 내용을 수정할 수 있어야 함', () => {
      // Arrange
      let toastResult: ReturnType<typeof toast>;

      act(() => {
        toastResult = toast({ title: '원본 제목' });
      });

      const { result } = renderHook(() => useToast());

      // Act
      act(() => {
        toastResult.update({ title: '수정된 제목', description: '새 설명' });
      });

      // Assert
      expect(result.current.toasts[0].title).toBe('수정된 제목');
      expect(result.current.toasts[0].description).toBe('새 설명');
    });
  });

  describe('🔴 RED: onOpenChange 콜백', () => {
    it('toast의 onOpenChange는 정의되어 있어야 함', () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      // Act
      act(() => {
        result.current.toast({
          title: '테스트',
        });
      });

      // Assert
      expect(result.current.toasts[0].onOpenChange).toBeDefined();
      expect(typeof result.current.toasts[0].onOpenChange).toBe('function');
    });

    it('onOpenChange(false) 호출 시 dismiss가 트리거되어야 함', async () => {
      // Arrange
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: '테스트',
        });
      });

      const toastOnOpenChange = result.current.toasts[0].onOpenChange;

      // Act
      act(() => {
        toastOnOpenChange?.(false);
      });

      // Assert - onOpenChange(false)가 호출되면 dismiss()가 실행되어 open이 false가 됨
      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('🔴 RED: 여러 hook 인스턴스 동기화', () => {
    it('여러 useToast hook이 동일한 state를 공유해야 함', () => {
      // Arrange
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      // Act
      act(() => {
        result1.current.toast({ title: '공유 Toast' });
      });

      // Assert
      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
      expect(result1.current.toasts[0].title).toBe('공유 Toast');
      expect(result2.current.toasts[0].title).toBe('공유 Toast');
    });
  });
});
