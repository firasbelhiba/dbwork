import React from 'react';
import { Issue } from '@/types/issue';
import { Badge } from '@/components/common';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const assignee = typeof issue.assignee === 'object' ? issue.assignee : null;
  const projectKey = typeof issue.projectId === 'object' ? issue.projectId.key : '';

  return (
    <Link
      href={`/issues/${issue._id}`}
      className="block bg-white dark:bg-dark-400 rounded-lg border border-gray-200 dark:border-dark-300 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Issue Type & Priority */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={issue.type as any}>{issue.type}</Badge>
        <Badge variant={issue.priority as any}>{issue.priority}</Badge>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {issue.title}
      </h4>

      {/* Issue Key */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {projectKey}-{issue._id.slice(-4)}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Labels */}
        <div className="flex items-center gap-1 flex-wrap">
          {issue.labels?.slice(0, 2).map((label, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300"
            >
              {label}
            </span>
          ))}
          {issue.labels && issue.labels.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{issue.labels.length - 2}</span>
          )}
        </div>

        {/* Assignee Avatar */}
        {assignee && (
          <div
            className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-700 shadow-sm"
            title={`${assignee.firstName} ${assignee.lastName}`}
          >
            {getInitials(assignee.firstName, assignee.lastName)}
          </div>
        )}
      </div>

      {/* Story Points */}
      {issue.storyPoints && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-300">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{issue.storyPoints} points</span>
          </div>
        </div>
      )}
    </Link>
  );
};
