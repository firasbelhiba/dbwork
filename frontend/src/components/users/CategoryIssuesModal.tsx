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
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && userId && category) {
      fetchIssues();
      setExpandedIssues(new Set());
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

  const toggleExpand = (issueId: string) => {
    setExpandedIssues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHours = (hours: number | undefined) => {
    if (!hours) return '0h';
    return `${hours}h`;
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
                const isExpanded = expandedIssues.has(issue._id);

                return (
                  <div
                    key={issue._id}
                    className="rounded-lg border border-gray-200 dark:border-dark-400 overflow-hidden transition-all"
                  >
                    {/* Collapsible header */}
                    <button
                      onClick={() => toggleExpand(issue._id)}
                      className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Expand/collapse icon */}
                        <svg
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>

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
                            <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-gray-100 text-gray-700 dark:bg-dark-400 dark:text-gray-300">
                              {issue.type}
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
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-dark-400 bg-gray-50 dark:bg-dark-500">
                        {/* Description */}
                        {issue.description && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Description
                            </h5>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {issue.description || 'No description provided'}
                            </p>
                          </div>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          {/* Story Points */}
                          {issue.storyPoints > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Story Points
                              </h5>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {issue.storyPoints}
                              </span>
                            </div>
                          )}

                          {/* Time Logged */}
                          {issue.timeTracking?.loggedHours > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Time Logged
                              </h5>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatHours(issue.timeTracking.loggedHours)}
                              </span>
                            </div>
                          )}

                          {/* Due Date */}
                          {issue.dueDate && (
                            <div>
                              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Due Date
                              </h5>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(issue.dueDate)}
                              </span>
                            </div>
                          )}

                          {/* Reporter */}
                          {reporter && (
                            <div>
                              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Reporter
                              </h5>
                              <div className="flex items-center gap-2">
                                {reporter.avatar ? (
                                  <img
                                    src={reporter.avatar}
                                    alt={`${reporter.firstName} ${reporter.lastName}`}
                                    className="w-5 h-5 rounded-full"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                                    {reporter.firstName?.charAt(0)}
                                  </div>
                                )}
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {reporter.firstName} {reporter.lastName}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Labels */}
                        {issue.labels && issue.labels.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              Labels
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {issue.labels.map((label, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* View full issue link */}
                        <Link
                          href={`/issues/${issue._id}`}
                          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>View full issue</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
