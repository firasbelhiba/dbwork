import React, { useState, useEffect, useRef } from 'react';
import { Issue } from '@/types/issue';
import { Badge, Dropdown, DropdownItem } from '@/components/common';
import { getInitials } from '@/lib/utils';
import { SprintStatus } from '@/types/sprint';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

// Format seconds to short timer display
const formatTimerDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

interface IssueCardProps {
  issue: Issue;
  onArchive?: (issueId: string) => void;
  onDelete?: (issueId: string) => void;
}

const getSprintStatusVariant = (status: SprintStatus) => {
  switch (status) {
    case SprintStatus.ACTIVE:
      return 'success' as const;
    case SprintStatus.COMPLETED:
      return 'default' as const;
    case SprintStatus.PLANNED:
      return 'warning' as const;
    default:
      return 'default' as const;
  }
};

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onArchive, onDelete }) => {
  const { user } = useAuth();
  const [timerSeconds, setTimerSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const assignees = issue.assignees?.filter(a => typeof a === 'object' && a !== null).map(a => a as any) || [];
  const sprint = typeof issue.sprintId === 'object' ? issue.sprintId : null;

  // Check if user can archive/delete (Admin or PM only)
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER;

  // Check if there's an active timer on this issue (visible to everyone)
  const activeEntry = issue.timeTracking?.activeTimeEntry;
  const hasActiveTimer = !!activeEntry;

  // Check if the current user owns the timer
  const isOwnTimer = activeEntry && activeEntry.userId === user?._id;

  // Timer should only be "running" (green) when issue is in_progress AND not paused
  // Timer should be "paused" (yellow) when there's an active timer but issue is NOT in_progress OR isPaused is true
  const isInProgress = issue.status === 'in_progress';
  const isTimerRunning = hasActiveTimer && isInProgress && !activeEntry.isPaused;
  const isTimerPaused = hasActiveTimer && (!isInProgress || activeEntry.isPaused);

  // Calculate and update timer display (visible to all users)
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Get fresh values from issue prop
    const currentActiveEntry = issue.timeTracking?.activeTimeEntry;
    const currentIsInProgress = issue.status === 'in_progress';

    // Show timer for all users, not just the owner
    if (!currentActiveEntry) {
      setTimerSeconds(0);
      return;
    }

    const calculateDuration = () => {
      const now = new Date();
      const startTime = new Date(currentActiveEntry.startTime);
      let duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      // If paused, calculate paused time
      if (currentActiveEntry.isPaused && currentActiveEntry.pausedAt) {
        const pausedAt = new Date(currentActiveEntry.pausedAt);
        const currentPauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
        duration -= (currentActiveEntry.accumulatedPausedTime + currentPauseDuration);
      } else {
        duration -= currentActiveEntry.accumulatedPausedTime;
      }

      return Math.max(0, duration);
    };

    // Set initial value
    setTimerSeconds(calculateDuration());

    // Only tick when issue is in_progress AND timer is not paused
    if (currentIsInProgress && !currentActiveEntry.isPaused) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(calculateDuration());
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [issue._id, issue.status, issue.timeTracking?.activeTimeEntry?.isPaused, issue.timeTracking?.activeTimeEntry?.startTime, issue.timeTracking?.activeTimeEntry?.accumulatedPausedTime, issue.timeTracking?.activeTimeEntry?.pausedAt, issue.timeTracking?.activeTimeEntry?.userId]);

  const handleArchive = () => {
    if (onArchive) {
      onArchive(issue._id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(issue._id);
    }
  };

  return (
    <div className="relative bg-white dark:bg-dark-400 rounded-lg border border-gray-200 dark:border-dark-300 p-4 hover:shadow-md transition-all group">
      {/* 3-Dot Menu (Top Right) */}
      {canManage && (
        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            align="right"
            trigger={
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 16 16">
                  <circle cx="8" cy="2" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="14" r="1.5" />
                </svg>
              </button>
            }
          >
            <DropdownItem onClick={handleArchive}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Archive</span>
              </div>
            </DropdownItem>
            <DropdownItem onClick={handleDelete} variant="danger">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </div>
            </DropdownItem>
          </Dropdown>
        </div>
      )}

      {/* Card Content (Wrapped in Link) */}
      <Link href={`/issues/${issue._id}`} className="block">
        {/* Issue Type & Priority */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant={issue.type as any}>{issue.type}</Badge>
          <Badge variant={issue.priority as any}>{issue.priority}</Badge>
          {issue.isArchived && (
            <Badge variant="warning">ARCHIVED</Badge>
          )}
          {/* Timer Badge */}
          {(isTimerRunning || isTimerPaused) && (
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                isTimerRunning
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isTimerRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              {formatTimerDisplay(timerSeconds)}
            </div>
          )}
        </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {issue.title}
      </h4>

      {/* Issue Key */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {issue.key}
      </p>

      {/* Sprint Badge */}
      {sprint && (
        <div className="mb-3">
          <Badge variant={getSprintStatusVariant(sprint.status)} dot>
            {sprint.name}
          </Badge>
        </div>
      )}

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

        {/* Assignee Avatars */}
        {assignees.length > 0 && (
          <div className="flex items-center -space-x-2">
            {assignees.slice(0, 3).map((assignee: any, index: number) => (
              assignee.avatar ? (
                <img
                  key={assignee._id}
                  src={assignee.avatar}
                  alt={`${assignee.firstName} ${assignee.lastName}`}
                  className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                  title={`${assignee.firstName} ${assignee.lastName}`}
                  style={{ zIndex: assignees.length - index }}
                />
              ) : (
                <div
                  key={assignee._id}
                  className="w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm"
                  title={`${assignee.firstName} ${assignee.lastName}`}
                  style={{ zIndex: assignees.length - index }}
                >
                  {getInitials(assignee.firstName, assignee.lastName)}
                </div>
              )
            ))}
            {assignees.length > 3 && (
              <div
                className="w-6 h-6 rounded-full bg-gray-500 dark:bg-gray-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm"
                title={`${assignees.length - 3} more assignees`}
              >
                +{assignees.length - 3}
              </div>
            )}
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
    </div>
  );
};
