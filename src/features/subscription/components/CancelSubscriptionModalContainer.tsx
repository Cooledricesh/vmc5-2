'use client';

import React from 'react';
import { CancelSubscriptionModal } from './SubscriptionModal';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { useToast } from '@/hooks/use-toast';
import { SUBSCRIPTION_MESSAGES } from '../constants/messages';

export interface CancelSubscriptionModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 구독 해지 모달 컨테이너
 *
 * 비즈니스 로직(API 호출, 에러 처리)과 UI(모달)를 연결하는 컨테이너 컴포넌트
 *
 * @example
 * ```tsx
 * <CancelSubscriptionModalContainer
 *   isOpen={showCancelModal}
 *   onClose={() => setShowCancelModal(false)}
 *   onSuccess={() => {
 *     console.log('Subscription cancelled successfully');
 *   }}
 * />
 * ```
 */
export function CancelSubscriptionModalContainer({
  isOpen,
  onClose,
  onSuccess,
}: CancelSubscriptionModalContainerProps) {
  const { toast } = useToast();

  const cancelMutation = useCancelSubscription({
    onSuccess: () => {
      toast({
        title: SUBSCRIPTION_MESSAGES.CANCEL.SUCCESS_TITLE,
        description: SUBSCRIPTION_MESSAGES.CANCEL.SUCCESS_DESCRIPTION,
        variant: 'default',
      });

      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      const errorMessage = extractErrorMessage(error);

      toast({
        title: SUBSCRIPTION_MESSAGES.CANCEL.ERROR_TITLE,
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleCancel = (reason?: string, feedbackText?: string) => {
    cancelMutation.mutate({
      cancellation_reason: reason || undefined,
      feedback: feedbackText || undefined,
    });
  };

  return (
    <CancelSubscriptionModal
      isOpen={isOpen}
      onClose={onClose}
      onCancel={handleCancel}
      loading={cancelMutation.isPending}
    />
  );
}

/**
 * API 에러 객체에서 사용자에게 보여줄 메시지를 추출
 */
function extractErrorMessage(error: Error): string {
  // Type guard for axios error
  if ('response' in error && error.response && typeof error.response === 'object') {
    const response = error.response as {
      data?: {
        error?: {
          message?: string;
        };
      };
    };

    return (
      response.data?.error?.message || SUBSCRIPTION_MESSAGES.CANCEL.ERROR_DEFAULT
    );
  }

  return error.message || SUBSCRIPTION_MESSAGES.CANCEL.ERROR_DEFAULT;
}
