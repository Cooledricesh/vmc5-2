'use client';

import { NewAnalysisProvider } from '@/features/new-analysis/context/NewAnalysisContext';

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

        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-500">
            폼 컴포넌트가 여기에 표시됩니다
          </p>
          <p className="text-center text-sm text-gray-400 mt-2">
            (개발 중)
          </p>
        </div>
      </div>
    </NewAnalysisProvider>
  );
}
