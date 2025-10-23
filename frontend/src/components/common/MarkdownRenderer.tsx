'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,

          // Paragraphs
          p: ({ node, ...props }) => <p className="mb-4" {...props} />,

          // Lists
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="ml-4" {...props} />,

          // Code
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code className="px-1.5 py-0.5 bg-gray-100 text-danger rounded text-sm font-mono" {...props} />
            ) : (
              <code className="block p-4 bg-gray-900 text-gray-100 rounded-md overflow-x-auto mb-4 font-mono text-sm" {...props} />
            ),
          pre: ({ node, ...props }) => <pre className="mb-4" {...props} />,

          // Links
          a: ({ node, ...props }) => (
            <a className="text-primary hover:text-primary-dark underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),

          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4" {...props} />
          ),

          // Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200" {...props} />,
          tr: ({ node, ...props }) => <tr {...props} />,
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
          ),
          td: ({ node, ...props }) => <td className="px-4 py-2 text-sm text-gray-900" {...props} />,

          // Horizontal rule
          hr: ({ node, ...props }) => <hr className="my-6 border-gray-200" {...props} />,

          // Strong/Bold
          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,

          // Emphasis/Italic
          em: ({ node, ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
