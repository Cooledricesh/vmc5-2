'use client';

import { NewAnalysisProvider } from '@/features/new-analysis/context/NewAnalysisContext';
import { AnalysisForm } from '@/features/new-analysis/components/AnalysisForm';

export default function NewAnalysisPage() {
  return (
    <NewAnalysisProvider>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold">새 분석하기</h1>
          <p className="text-gray-600 mt-2">
            AI가 사주팔자를 분석해드립니다
          </p>
        </header>

        <AnalysisForm />
      </div>
    </NewAnalysisProvider>
  );
}
