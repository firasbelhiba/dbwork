'use client';

import React from 'react';
import { IChangelog } from '@/types';
import { Badge } from '@/components/common/Badge';

interface ChangelogCardProps {
  changelog: IChangelog;
  onEdit?: (changelog: IChangelog) => void;
  onDelete?: (changelog: IChangelog) => void;
}

export const ChangelogCard: React.FC<ChangelogCardProps> = ({
  changelog,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="primary">
              v{changelog.version}
            </Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(changelog.releaseDate)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {changelog.title}
          </h3>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 ml-4">
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
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
        {changelog.description}
      </p>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        {changelog.features && changelog.features.length > 0 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{changelog.features.length} features</span>
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
            <span>{changelog.improvements.length} improvements</span>
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
            <span>{changelog.bugFixes.length} bug fixes</span>
          </div>
        )}
      </div>
    </div>
  );
};
