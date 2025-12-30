'use client';

import React, { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';
import { LogoLoader } from '@/components/common/LogoLoader';

interface QueueIssue {
  _id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  projectId: {
    _id: string;
    name: string;
    key: string;
    logo?: string;
  };
}

interface AddToQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  userId: string;
}

const priorityColors: Record<string, string> = {
  highest: 'text-danger-500',
  high: 'text-warning-500',
  medium: 'text-primary-500',
  low: 'text-success-500',
  lowest: 'text-gray-400',
};

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
};

export const AddToQueueModal: React.FC<AddToQueueModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  userId,
}) => {
  const [availableIssues, setAvailableIssues] = useState<QueueIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailable();
    }
  }, [isOpen, userId]);

  const fetchAvailable = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAvailableForQueue(userId);
      setAvailableIssues(response.data || []);
    } catch (error) {
      console.error('Error fetching available issues:', error);
      setAvailableIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (issueId: string) => {
    try {
      setAdding(issueId);
      await usersAPI.addToQueue(userId, issueId);
      // Remove from available list
      setAvailableIssues((prev) => prev.filter((i) => i._id !== issueId));
      onAdd();
    } catch (error) {
      console.error('Error adding to queue:', error);
    } finally {
      setAdding(null);
    }
  };

  const filteredIssues = availableIssues.filter((issue) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.key.toLowerCase().includes(query) ||
      issue.title.toLowerCase().includes(query) ||
      issue.projectId?.name?.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-300 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-400">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Add to Queue
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-400">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-400 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LogoLoader size="sm" text="Loading tickets" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? 'No matching tickets found'
                  : 'All your assigned tickets are already in queue'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredIssues.map((issue) => (
                <div
                  key={issue._id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors"
                >
                  {/* Issue info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Project logo */}
                      {issue.projectId?.logo ? (
                        <img
                          src={issue.projectId.logo}
                          alt=""
                          className="w-5 h-5 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-primary-500 text-white text-[10px] flex items-center justify-center flex-shrink-0">
                          {issue.projectId?.key?.charAt(0) || '?'}
                        </div>
                      )}

                      {/* Key */}
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {issue.key}
                      </span>

                      {/* Status badge */}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-500 text-gray-600 dark:text-gray-400">
                        {statusLabels[issue.status] || issue.status}
                      </span>

                      {/* Priority */}
                      <svg
                        className={`w-3.5 h-3.5 flex-shrink-0 ${priorityColors[issue.priority] || 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {issue.priority === 'highest' || issue.priority === 'high' ? (
                          <path
                            fillRule="evenodd"
                            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        ) : issue.priority === 'low' || issue.priority === 'lowest' ? (
                          <path
                            fillRule="evenodd"
                            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    </div>

                    {/* Title */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {issue.title}
                    </p>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={() => handleAdd(issue._id)}
                    disabled={adding === issue._id}
                    className="flex-shrink-0 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors disabled:opacity-50"
                  >
                    {adding === issue._id ? (
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-400">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
