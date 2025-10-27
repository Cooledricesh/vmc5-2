'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Smartphone,
  Building2,
  AlertCircle,
  CheckCircle,
  Shield,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 카드 브랜드 아이콘 매핑
const cardBrandIcons: Record<string, string> = {
  'VISA': '💳',
  'MASTERCARD': '💳',
  'AMEX': '💳',
  'BC': '🏦',
  'SAMSUNG': '💳',
  'SHINHAN': '🏦',
  'KB': '🏦',
  'HYUNDAI': '🏦',
  'LOTTE': '🏦',
  'HANA': '🏦',
  'NH': '🏦',
};

export interface PaymentMethod {
  id: string;
  type: 'CARD' | 'EASY_PAY' | 'BANK';
  name: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (method: any) => void;
  onUpdate?: (methodId: string) => void;
  currentMethods?: PaymentMethod[];
  loading?: boolean;
}

export function PaymentMethodModal({
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  currentMethods = [],
  loading = false,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'easy' | 'bank'>('card');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = () => {
    if (!termsAccepted) return;
    onAdd({ type: selectedMethod });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>결제 수단 등록</DialogTitle>
          <DialogDescription>
            구독 결제에 사용할 결제 수단을 등록해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 현재 등록된 결제 수단 */}
          {currentMethods.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">현재 결제 수단</Label>
              <div className="space-y-2">
                {currentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={cn(
                      'flex items-center justify-between p-3',
                      'border rounded-lg',
                      method.isDefault && 'bg-blue-50 border-blue-200'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {method.type === 'CARD' ? (
                        <CreditCard className="h-4 w-4 text-gray-600" />
                      ) : method.type === 'EASY_PAY' ? (
                        <Smartphone className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-gray-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{method.name}</span>
                          {method.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              기본
                            </span>
                          )}
                        </div>
                        {method.last4 && (
                          <span className="text-xs text-gray-500">
                            **** {method.last4}
                          </span>
                        )}
                      </div>
                    </div>
                    {onUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdate(method.id)}
                      >
                        변경
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 결제 수단 선택 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">새 결제 수단 추가</Label>
            <RadioGroup
              value={selectedMethod}
              onValueChange={(value: any) => setSelectedMethod(value)}
            >
              <div className="space-y-2">
                <label
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-lg cursor-pointer',
                    'hover:bg-gray-50 transition-colors',
                    selectedMethod === 'card' && 'border-blue-500 bg-blue-50'
                  )}
                >
                  <RadioGroupItem value="card" />
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">신용/체크카드</div>
                    <div className="text-xs text-gray-500">
                      Visa, Mastercard, BC카드 등 모든 카드 사용 가능
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-lg cursor-pointer',
                    'hover:bg-gray-50 transition-colors',
                    selectedMethod === 'easy' && 'border-blue-500 bg-blue-50'
                  )}
                >
                  <RadioGroupItem value="easy" />
                  <Smartphone className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">간편결제</div>
                    <div className="text-xs text-gray-500">
                      카카오페이, 네이버페이, 토스페이 등
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-lg cursor-pointer',
                    'hover:bg-gray-50 transition-colors',
                    selectedMethod === 'bank' && 'border-blue-500 bg-blue-50'
                  )}
                >
                  <RadioGroupItem value="bank" />
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">계좌이체</div>
                    <div className="text-xs text-gray-500">
                      은행 계좌에서 자동이체
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* 보안 안내 */}
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm">
              <div className="flex items-center gap-2 font-medium mb-1">
                <Lock className="h-3 w-3" />
                안전한 결제
              </div>
              결제 정보는 암호화되어 안전하게 보호되며, PCI-DSS 인증을 받은
              토스페이먼츠를 통해 처리됩니다.
            </AlertDescription>
          </Alert>

          {/* 약관 동의 */}
          <div className="border-t pt-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1"
              />
              <div className="text-sm">
                <span>결제 약관 및 자동결제 동의</span>
                <p className="text-xs text-gray-500 mt-1">
                  매월 자동으로 구독료가 결제되며, 언제든지 취소할 수 있습니다.
                </p>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!termsAccepted || loading}
          >
            {loading ? '처리 중...' : '결제 수단 등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 결제 수단 변경 확인 모달
export interface ChangePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentMethod?: PaymentMethod;
  newMethod?: PaymentMethod;
  loading?: boolean;
}

export function ChangePaymentModal({
  isOpen,
  onClose,
  onConfirm,
  currentMethod,
  newMethod,
  loading = false,
}: ChangePaymentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>결제 수단 변경</DialogTitle>
          <DialogDescription>
            다음 결제부터 새로운 결제 수단이 적용됩니다
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {currentMethod && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">현재 결제 수단</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <CreditCard className="h-4 w-4 text-gray-600" />
                <div>
                  <div className="text-sm font-medium">{currentMethod.name}</div>
                  {currentMethod.last4 && (
                    <div className="text-xs text-gray-500">
                      **** {currentMethod.last4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {newMethod && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">새 결제 수단</Label>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">{newMethod.name}</div>
                  {newMethod.last4 && (
                    <div className="text-xs text-gray-500">
                      **** {newMethod.last4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              결제 수단을 변경해도 현재 결제 주기에는 영향을 주지 않습니다.
              다음 결제일부터 새로운 결제 수단으로 청구됩니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? '변경 중...' : '변경 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}