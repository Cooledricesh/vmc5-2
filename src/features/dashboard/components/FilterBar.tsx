'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { PERIOD_OPTIONS, SORT_OPTIONS } from '../lib/constants';

export function FilterBar() {
  const { state, actions } = useDashboardContext();
  const { period, sort } = state.filters;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex gap-4 flex-1">
        <Select value={period} onValueChange={actions.setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={actions.setSort}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="정렬 선택" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={actions.resetFilters}
        title="필터 초기화"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
