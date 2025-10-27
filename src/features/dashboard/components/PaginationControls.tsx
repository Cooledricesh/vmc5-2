'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';

export function PaginationControls() {
  const { state, actions } = useDashboardContext();
  const { current_page } = state.pagination;
  const { total_pages } = state.analyses.pagination;

  if (total_pages <= 1) {
    return null;
  }

  const pages = Array.from({ length: total_pages }, (_, i) => i + 1);
  const showPages = pages.filter((page) => {
    if (total_pages <= 7) return true;
    if (page === 1 || page === total_pages) return true;
    if (Math.abs(page - current_page) <= 1) return true;
    return false;
  });

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        onClick={() => actions.setPage(current_page - 1)}
        disabled={current_page === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {showPages.map((page, index) => {
        const prevPage = showPages[index - 1];
        const showEllipsis = prevPage && page - prevPage > 1;

        return (
          <div key={page} className="flex items-center gap-2">
            {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
            <Button
              variant={current_page === page ? 'default' : 'outline'}
              size="icon"
              onClick={() => actions.setPage(page)}
            >
              {page}
            </Button>
          </div>
        );
      })}

      <Button
        variant="outline"
        size="icon"
        onClick={() => actions.setPage(current_page + 1)}
        disabled={current_page === total_pages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
