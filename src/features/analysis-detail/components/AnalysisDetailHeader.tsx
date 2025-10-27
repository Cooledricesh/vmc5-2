'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, MoreVertical, Trash2, RefreshCw } from 'lucide-react';
import { useAnalysisDetailContext } from '../context/AnalysisDetailContext';

export function AnalysisDetailHeader() {
  const router = useRouter();
  const { actions, computed } = useAnalysisDetailContext();

  return (
    <div className="mb-6 flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        뒤로가기
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {computed.canReanalyze && (
            <DropdownMenuItem onClick={actions.openReanalyzeModal}>
              <RefreshCw className="mr-2 h-4 w-4" />
              재분석
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={actions.openDeleteModal}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
