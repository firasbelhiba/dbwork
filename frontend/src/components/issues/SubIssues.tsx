'use client';

import React, { useState, useEffect } from 'react';
import { Issue } from '@/types/issue';
import { issuesAPI } from '@/lib/api';
import { Badge, Button, LogoLoader } from '@/components/common';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface SubIssuesProps {
  parentIssueId: string;
  parentIssueKey: string;
  onCreateSubIssue: () => void;
}

export const SubIssues: React.FC<SubIssuesProps> = ({
  parentIssueId,
  parentIssueKey,
  onCreateSubIssue,
}) => {
  const [subIssues, setSubIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubIssues();
  }, [parentIssueId]);

  const fetchSubIssues = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getSubIssues(parentIssueId);
      setSubIssues(response.data);
    } catch (error) {
      console.error('Error fetching sub-issues:', error);
      toast.error('Failed to load sub-issues');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sub-issues</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <LogoLoader size="sm" text="Loading sub-issues" />
        </div>
      </div>
    );
  }

  // Calculate progress
  const completedCount = subIssues.filter(issue => issue.status === 'done').length;
  const totalCount = subIssues.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sub-issues</h3>
          <Badge variant="default">{subIssues.length}</Badge>
          {totalCount > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ({completedCount}/{totalCount} completed)
            </span>
          )}
        </div>
        <Button size="sm" onClick={onCreateSubIssue}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Sub-issue
        </Button>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                progressPercentage === 100
                  ? 'bg-green-500'
                  : progressPercentage >= 50
                  ? 'bg-blue-500'
                  : 'bg-yellow-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {subIssues.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No sub-issues yet</p>
          <p className="text-xs mt-1">Create sub-issues to break down this task into smaller pieces</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subIssues.map((subIssue) => (
            <Link
              key={subIssue._id}
              href={`/issues/${subIssue._id}`}
              className="block p-3 rounded-lg border border-gray-200 dark:border-dark-300 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={subIssue.type as any}>{subIssue.type}</Badge>
                    <Badge variant={subIssue.priority as any}>{subIssue.priority}</Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{subIssue.key}</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {subIssue.title}
                  </h4>
                  {subIssue.assignees && subIssue.assignees.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Assigned to: {subIssue.assignees.map((a: any) =>
                          typeof a === 'object' ? `${a.firstName} ${a.lastName}` : 'Unknown'
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <Badge variant={subIssue.status as any} dot>
                  {subIssue.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
