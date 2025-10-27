'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Star,
  TrendingUp,
  Zap,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'upgrade' | 'cancel' | 'payment' | 'success' | 'error';
  actions?: {
    primary?: {
      label: string;
      onClick: () => void;
      loading?: boolean;
      disabled?: boolean;
      variant?: 'default' | 'destructive';
    };
    secondary?: {
      label: string;
      onClick: () => void;
      disabled?: boolean;
    };
  };
}

export function SubscriptionModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = 'default',
  actions,
}: SubscriptionModalProps) {
  const getVariantIcon = () => {
    switch (variant) {
      case 'upgrade':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'cancel':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Star className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getVariantHeaderClass = () => {
    switch (variant) {
      case 'upgrade':
        return 'border-b-blue-200 bg-blue-50';
      case 'cancel':
        return 'border-b-red-200 bg-red-50';
      case 'payment':
        return 'border-b-green-200 bg-green-50';
      case 'success':
        return 'border-b-green-200 bg-green-50';
      case 'error':
        return 'border-b-red-200 bg-red-50';
      default:
        return 'border-b-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className={cn('pb-4 border-b', getVariantHeaderClass())}>
          <div className="flex items-center gap-3">
            {getVariantIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="mt-2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">
          {children}
        </div>

        {actions && (
          <DialogFooter>
            {actions.secondary && (
              <Button
                variant="outline"
                onClick={actions.secondary.onClick}
                disabled={actions.secondary.disabled}
              >
                {actions.secondary.label}
              </Button>
            )}
            {actions.primary && (
              <Button
                variant={actions.primary.variant || 'default'}
                onClick={actions.primary.onClick}
                disabled={actions.primary.disabled || actions.primary.loading}
              >
                {actions.primary.loading ? '처리 중...' : actions.primary.label}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Pro 구독 업그레이드 모달
export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  loading?: boolean;
  currentPlan?: 'free' | 'pro';
}

export function UpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  loading = false,
  currentPlan = 'free',
}: UpgradeModalProps) {
  const benefits = [
    { icon: Zap, text: '무제한 사주 분석', highlight: true },
    { icon: Star, text: '프리미엄 운세 해석' },
    { icon: Clock, text: '실시간 운세 업데이트' },
    { icon: Shield, text: '광고 없는 서비스' },
  ];

  return (
    <SubscriptionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pro 멤버십으로 업그레이드"
      description="더 많은 혜택과 함께 깊이 있는 사주 분석을 경험하세요"
      variant="upgrade"
      actions={{
        primary: {
          label: loading ? '처리 중...' : '월 9,900원으로 시작하기',
          onClick: onUpgrade,
          loading,
          disabled: loading || currentPlan === 'pro',
        },
        secondary: {
          label: '나중에',
          onClick: onClose,
        },
      }}
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">₩9,900</span>
            <Badge variant="secondary">매월</Badge>
          </div>
          <p className="text-sm text-gray-600">첫 달 무료 체험 포함</p>
        </div>

        <div className="space-y-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-3 p-2',
                  benefit.highlight && 'bg-blue-50 rounded-lg'
                )}
              >
                <Icon className="h-5 w-5 text-blue-600" />
                <span className={cn(
                  'text-sm',
                  benefit.highlight && 'font-semibold'
                )}>
                  {benefit.text}
                </span>
              </div>
            );
          })}
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm">
            언제든지 구독을 취소할 수 있으며, 취소 시에도 결제 주기가 끝날 때까지
            Pro 혜택을 이용하실 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>
    </SubscriptionModal>
  );
}

// 구독 취소 모달
export interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: (reason?: string) => void;
  loading?: boolean;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onCancel,
  loading = false,
}: CancelSubscriptionModalProps) {
  const [reason, setReason] = React.useState<string>('');
  const [feedback, setFeedback] = React.useState<string>('');

  const cancellationReasons = [
    { value: 'expensive', label: '가격이 비싸다고 생각해요' },
    { value: 'not_useful', label: '기능이 유용하지 않아요' },
    { value: 'temporary', label: '일시적으로 사용을 중단하려고 해요' },
    { value: 'alternative', label: '다른 서비스를 이용하려고 해요' },
    { value: 'other', label: '기타' },
  ];

  return (
    <SubscriptionModal
      isOpen={isOpen}
      onClose={onClose}
      title="정말 구독을 취소하시겠어요?"
      description="구독을 취소하시면 Pro 혜택을 더 이상 이용하실 수 없습니다"
      variant="cancel"
      actions={{
        primary: {
          label: loading ? '처리 중...' : '구독 취소',
          onClick: () => onCancel(reason),
          loading,
          disabled: loading || !reason,
          variant: 'destructive',
        },
        secondary: {
          label: '구독 유지',
          onClick: onClose,
        },
      }}
    >
      <div className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm">
            현재 결제 주기가 끝날 때까지 Pro 혜택을 계속 이용하실 수 있습니다.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <label className="text-sm font-medium">
            취소 사유를 알려주세요 (필수)
          </label>
          <div className="space-y-2">
            {cancellationReasons.map((item) => (
              <label
                key={item.value}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={item.value}
                  checked={reason === item.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {reason === 'other' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              자세한 피드백을 남겨주세요
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="서비스 개선에 도움이 됩니다..."
              className="w-full p-3 border rounded-lg resize-none h-20 text-sm"
            />
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600">
            구독을 취소하더라도 현재 결제 주기가 종료되는 날까지 서비스를 이용하실 수 있으며,
            언제든지 다시 구독하실 수 있습니다.
          </p>
        </div>
      </div>
    </SubscriptionModal>
  );
}