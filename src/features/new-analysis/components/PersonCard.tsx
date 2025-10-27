'use client';

import React from 'react';
import { User, Calendar, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface PersonData {
  name: string;
  birthdate: Date;
  isLunar: boolean;
  gender: 'male' | 'female';
  birthLocation?: string;
  birthTime?: {
    hour: number;
    minute: number;
  };
}

export interface PersonCardProps {
  person: PersonData;
  onRemove?: () => void;
  onEdit?: () => void;
  isEditable?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

export function PersonCard({
  person,
  onRemove,
  onEdit,
  isEditable = true,
  className,
  variant = 'default'
}: PersonCardProps) {
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  };

  const formatTime = (time?: { hour: number; minute: number }) => {
    if (!time) return '시간 정보 없음';
    const hour = String(time.hour).padStart(2, '0');
    const minute = String(time.minute).padStart(2, '0');
    return `${hour}시 ${minute}분`;
  };

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3',
          'bg-white border rounded-lg',
          'hover:shadow-md transition-shadow',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              person.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
            )}
          >
            <User
              className={cn(
                'h-5 w-5',
                person.gender === 'male' ? 'text-blue-600' : 'text-pink-600'
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{person.name}</span>
              <Badge variant="secondary" className="text-xs">
                {person.gender === 'male' ? '남성' : '여성'}
              </Badge>
              {person.isLunar && (
                <Badge variant="outline" className="text-xs">
                  음력
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(person.birthdate)} {person.birthTime && formatTime(person.birthTime)}
            </div>
          </div>
        </div>

        {isEditable && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border rounded-lg p-4',
        'hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            person.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
          )}
        >
          <User
            className={cn(
              'h-6 w-6',
              person.gender === 'male' ? 'text-blue-600' : 'text-pink-600'
            )}
          />
        </div>

        {isEditable && (
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-xs"
              >
                수정
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <h3 className="font-semibold text-lg">{person.name}</h3>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary">
              {person.gender === 'male' ? '남성' : '여성'}
            </Badge>
            {person.isLunar && (
              <Badge variant="outline">음력</Badge>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(person.birthdate)}</span>
            {person.birthTime && (
              <span className="text-gray-500">
                {formatTime(person.birthTime)}
              </span>
            )}
          </div>

          {person.birthLocation && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{person.birthLocation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}