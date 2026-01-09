'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common';
import { LogoLoader } from '@/components/common/LogoLoader';
import { issuesAPI } from '@/lib/api';
import { Issue } from '@/types/issue';
import { User } from '@/types/user';
import Link from 'next/link';

interface CategoryIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  category: string;
  categoryColor: string;
}

const formatCategoryName = (name: string): string => {
  if (!name) return 'Unknown';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const typeIcons: Record<string, string> = {
  bug: '🐛',
  feature: '✨',
  task: '📋',
  story: '📖',
  epic: '🎯',
  improvement: '💡',
};

export const CategoryIssuesModal: React.FC<CategoryIssuesModalProps> = ({
  isOpen,
  onClose,
  userId,
  category,
  categoryColor,
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId && category) {
      fetchIssues();
    }
  }, [isOpen, userId, category]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getUserIssuesByCategory(userId, category);
      setIssues(response.data);
    } catch (error) {
      console.error('Error fetching category issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${formatCategoryName(category)} Issues`}
      size="lg"
    >
      <div className="max-h-[70vh] overflow-hidden flex flex-col">
        {/* Header with category badge */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-dark-400">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {issues.length} Completed {issues.length === 1 ? 'Issue' : 'Issues'}
          </span>
        </div>

        {/* Issues list */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LogoLoader size="sm" text="Loading issues" />
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No issues found in this category
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => {
                const project = typeof issue.projectId === 'object' ? issue.projectId : null;
                const reporter = typeof issue.reporter === 'object' ? issue.reporter as User : null;

                return (
                  <Link
                    key={issue._id}
                    href={`/issues/${issue._id}`}
                    className="block p-4 rounded-lg border border-gray-200 dark:border-dark-400 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-dark-500 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Type icon */}
                      <span className="text-xl flex-shrink-0">
                        {typeIcons[issue.type] || '📋'}
                      </span>

                      {/* Issue details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            {issue.key}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityColors[issue.priority] || 'bg-gray-100 text-gray-700'}`}>
                            {issue.priority}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {issue.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {project && (
                            <div className="flex items-center gap-1">
                              {project.logo ? (
                                <img src={project.logo} alt={project.name} className="w-4 h-4 rounded" />
                              ) : (
                                <div className="w-4 h-4 rounded bg-gray-300 dark:bg-dark-400 flex items-center justify-center text-[10px] font-bold">
                                  {project.name?.charAt(0)}
                                </div>
                              )}
                              <span>{project.name}</span>
                            </div>
                          )}
                          {issue.updatedAt && (
                            <span>Completed {formatDate(issue.updatedAt)}</span>
                          )}
                        </div>
                      </div>

                      {/* Assignees */}
                      <div className="flex -space-x-2 flex-shrink-0">
                        {issue.assignees?.slice(0, 3).map((assignee, index) => {
                          const user = typeof assignee === 'object' ? assignee as User : null;
                          if (!user) return null;
                          return user.avatar ? (
                            <img
                              key={user._id || index}
                              src={user.avatar}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-6 h-6 rounded-full border-2 border-white dark:border-dark-600"
                              title={`${user.firstName} ${user.lastName}`}
                            />
                          ) : (
                            <div
                              key={user._id || index}
                              className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 border-2 border-white dark:border-dark-600"
                              title={`${user.firstName} ${user.lastName}`}
                            >
                              {user.firstName?.charAt(0)}
                            </div>
                          );
                        })}
                        {issue.assignees && issue.assignees.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-400 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 border-2 border-white dark:border-dark-600">
                            +{issue.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
