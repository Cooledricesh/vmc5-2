'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  components?: any;
  allowDangerousHtml?: boolean;
}

/**
 * 마크다운 컨텐츠를 안전하게 렌더링하는 컴포넌트
 */
export function MarkdownRenderer({
  content,
  className,
  components: customComponents,
  allowDangerousHtml = false,
}: MarkdownRendererProps) {
  const defaultComponents = {
    // 제목 스타일링
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold mb-4 mt-8 first:mt-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-bold mb-3 mt-6" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-semibold mb-2 mt-4" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-lg font-semibold mb-2 mt-3" {...props}>
        {children}
      </h4>
    ),

    // 문단 스타일링
    p: ({ children, ...props }: any) => (
      <p className="mb-4 leading-relaxed" {...props}>
        {children}
      </p>
    ),

    // 리스트 스타일링
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc pl-6 mb-4 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="mb-1" {...props}>
        {children}
      </li>
    ),

    // 인용구 스타일링
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-gray-300 pl-4 py-2 mb-4 italic text-gray-700 bg-gray-50 rounded-r"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // 코드 블록 스타일링
    code: ({ inline, className: codeClassName, children, ...props }: any) => {
      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className={cn(
            'block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm',
            codeClassName
          )}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }: any) => (
      <pre className="mb-4 overflow-x-auto" {...props}>
        {children}
      </pre>
    ),

    // 테이블 스타일링
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: any) => (
      <thead className="bg-gray-50" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: any) => (
      <tbody className="bg-white divide-y divide-gray-200" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: any) => (
      <tr {...props}>{children}</tr>
    ),
    th: ({ children, ...props }: any) => (
      <th
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm" {...props}>
        {children}
      </td>
    ),

    // 링크 스타일링
    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),

    // 이미지 스타일링
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg shadow-md my-4"
        loading="lazy"
        {...props}
      />
    ),

    // 수평선 스타일링
    hr: (props: any) => (
      <hr className="my-8 border-gray-300" {...props} />
    ),

    // 강조 스타일링
    strong: ({ children, ...props }: any) => (
      <strong className="font-bold text-gray-900" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: any) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),
  };

  const components = {
    ...defaultComponents,
    ...customComponents,
  };

  return (
    <div className={cn('prose prose-gray max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          ...(allowDangerousHtml ? [] : [rehypeSanitize]),
          rehypeHighlight,
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 마크다운 컨텐츠를 React 엘리먼트로 렌더링하는 함수
 * @param content - 마크다운 문자열
 * @param options - 렌더링 옵션
 * @returns React 엘리먼트
 */
export function renderMarkdown(
  content: string,
  options?: Omit<MarkdownRendererProps, 'content'>
): React.ReactElement {
  return <MarkdownRenderer content={content} {...options} />;
}

/**
 * 마크다운 텍스트에서 HTML 태그를 제거하고 순수 텍스트만 추출하는 함수
 * @param markdown - 마크다운 문자열
 * @returns 순수 텍스트
 */
export function stripMarkdown(markdown: string): string {
  // 코드 블록 제거
  let text = markdown.replace(/```[^`]*```/g, '');

  // 인라인 코드 제거
  text = text.replace(/`[^`]+`/g, '');

  // 링크 텍스트만 남기기
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 이미지 제거
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // 헤딩 마크업 제거
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 굵은 글씨 제거
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');

  // 이탤릭 제거
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // 인용구 제거
  text = text.replace(/^>\s+/gm, '');

  // 리스트 마커 제거
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // 수평선 제거
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // 여러 개의 줄바꿈을 하나로
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * 마크다운 텍스트의 첫 번째 문단을 추출하는 함수
 * @param markdown - 마크다운 문자열
 * @param maxLength - 최대 길이
 * @returns 첫 번째 문단 또는 잘린 텍스트
 */
export function getMarkdownExcerpt(
  markdown: string,
  maxLength: number = 150
): string {
  const stripped = stripMarkdown(markdown);
  const firstParagraph = stripped.split('\n\n')[0];

  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }

  return firstParagraph.substring(0, maxLength).trim() + '...';
}