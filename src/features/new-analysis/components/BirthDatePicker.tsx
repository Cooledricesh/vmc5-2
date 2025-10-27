'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface BirthDatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
}

const months = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
];

export function BirthDatePicker({
  label,
  value,
  onChange,
  min = new Date(1900, 0, 1),
  max = new Date(),
  disabled = false,
  error,
  className,
  placeholder = '생년월일을 선택하세요'
}: BirthDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value?.getFullYear() || max.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() || max.getMonth());

  const handleYearChange = (increment: number) => {
    const newYear = viewYear + increment;
    if (newYear >= min.getFullYear() && newYear <= max.getFullYear()) {
      setViewYear(newYear);
    }
  };

  const handleMonthChange = (increment: number) => {
    const newMonth = viewMonth + increment;
    if (newMonth < 0) {
      handleYearChange(-1);
      setViewMonth(11);
    } else if (newMonth > 11) {
      handleYearChange(1);
      setViewMonth(0);
    } else {
      setViewMonth(newMonth);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    if (newDate >= min && newDate <= max) {
      onChange(newDate);
      setIsOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth);

  const isDateDisabled = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    return date < min || date > max;
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-700">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5',
          'border rounded-lg bg-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          error ? 'border-red-500' : 'border-gray-300',
          !disabled && 'hover:border-gray-400'
        )}
      >
        <span className={cn('flex-1 text-left', !value && 'text-gray-400')}>
          {value ? formatDate(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            {/* Year and Month Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleYearChange(-1)}
                  disabled={viewYear <= min.getFullYear()}
                  className="h-8 w-8"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="font-semibold min-w-[60px] text-center">
                  {viewYear}년
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleYearChange(1)}
                  disabled={viewYear >= max.getFullYear()}
                  className="h-8 w-8"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMonthChange(-1)}
                  className="h-8 w-8"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="font-semibold min-w-[50px] text-center">
                  {months[viewMonth]}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMonthChange(1)}
                  className="h-8 w-8"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Days of Week Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div
                  key={day}
                  className="text-xs text-gray-500 text-center font-medium py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isDisabled = isDateDisabled(day);
                const isSelected = value &&
                  value.getFullYear() === viewYear &&
                  value.getMonth() === viewMonth &&
                  value.getDate() === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isDisabled}
                    className={cn(
                      'h-8 rounded text-sm transition-colors',
                      'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      isDisabled && 'opacity-30 cursor-not-allowed',
                      isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                      !isSelected && !isDisabled && 'hover:bg-gray-100'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-3 border-t flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth());
                  onChange(today);
                  setIsOpen(false);
                }}
              >
                오늘
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              >
                지우기
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}