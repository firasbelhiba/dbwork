'use client';

import React, { useState } from 'react';
import { IChangelog } from '@/types';
import { Badge } from '@/components/common/Badge';

interface ChangelogAccordionProps {
  changelog: IChangelog;
  defaultExpanded?: boolean;
  onEdit?: (changelog: IChangelog) => void;
  onDelete?: (changelog: IChangelog) => void;
}

export const ChangelogAccordion: React.FC<ChangelogAccordionProps> = ({
  changelog,
  defaultExpanded = false,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="primary">
              v{changelog.version}
            </Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(changelog.releaseDate)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-left">
            {changelog.title}
          </h3>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary badges */}
          <div className="flex items-center gap-3 text-sm">
            {changelog.features && changelog.features.length > 0 && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{changelog.features.length}</span>
              </div>
            )}
            {changelog.improvements && changelog.improvements.length > 0 && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{changelog.improvements.length}</span>
              </div>
            )}
            {changelog.bugFixes && changelog.bugFixes.length > 0 && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{changelog.bugFixes.length}</span>
              </div>
            )}
          </div>

          {/* Edit/Delete buttons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <button
                  onClick={() => onEdit(changelog)}
                  className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(changelog)}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Expand/Collapse icon */}
          <svg
            className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-gray-200 dark:border-dark-400 pt-6">
          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300">
            {changelog.description}
          </p>

          {/* Features */}
          {changelog.features && changelog.features.length > 0 && (
            <div>
              <h5 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
                New Features
              </h5>
              <ul className="space-y-2 ml-8">
                {changelog.features.map((feature, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-300 flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {changelog.improvements && changelog.improvements.length > 0 && (
            <div>
              <h5 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </span>
                Improvements
              </h5>
              <ul className="space-y-2 ml-8">
                {changelog.improvements.map((improvement, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-300 flex items-start">
                    <span className="mr-2 text-blue-500">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bug Fixes */}
          {changelog.bugFixes && changelog.bugFixes.length > 0 && (
            <div>
              <h5 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </span>
                Bug Fixes
              </h5>
              <ul className="space-y-2 ml-8">
                {changelog.bugFixes.map((bugFix, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-300 flex items-start">
                    <span className="mr-2 text-red-500">•</span>
                    <span>{bugFix}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
