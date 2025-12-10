import React, { useState, useEffect, useRef } from 'react';
import { Issue } from '@/types/issue';
import { Badge, Dropdown, DropdownItem } from '@/components/common';
import { getInitials } from '@/lib/utils';
import { SprintStatus } from '@/types/sprint';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { issuesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

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
  onIssueUpdate?: (updatedIssue: Issue) => void;
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

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onArchive, onDelete, onIssueUpdate }) => {
  const { user } = useAuth();
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
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

  // Check if timer is in extra hours mode
  const isExtraHours = activeEntry?.isExtraHours === true;

  // Check if timer was auto-paused at end of day (can resume for extra hours)
  const canResumeForExtraHours = isOwnTimer && activeEntry?.isPaused && activeEntry?.autoPausedEndOfDay;

  // Timer should only be "running" (green/purple) when issue is in_progress AND not paused
  // Timer should be "paused" (yellow) when there's an active timer but issue is NOT in_progress OR isPaused is true
  const isInProgress = issue.status === 'in_progress';
  const isTimerRunning = hasActiveTimer && isInProgress && !activeEntry.isPaused;
  const isTimerPaused = hasActiveTimer && (!isInProgress || activeEntry.isPaused);

  // Handle resume timer after end-of-day auto-pause
  // Timer will be marked as extra hours only if user has worked 8+ hours today
  const handleResumeTimer = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOwnTimer || isResuming) return;

    setIsResuming(true);
    try {
      const response = await issuesAPI.resumeTimer(issue._id);
      // Check if the resumed timer is marked as extra hours
      const isNowExtraHours = response.data.timeTracking?.activeTimeEntry?.isExtraHours;
      if (isNowExtraHours) {
        toast.success('Timer resumed - Extra hours tracking started!');
      } else {
        toast.success('Timer resumed - Continue working to reach 8 hours for extra hours');
      }
      if (onIssueUpdate) {
        onIssueUpdate(response.data);
      }
    } catch (error: any) {
      console.error('Error resuming timer:', error);
      toast.error(error?.response?.data?.message || 'Failed to resume timer');
    } finally {
      setIsResuming(false);
    }
  };

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
            <div className="inline-flex items-center gap-1">
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                  isTimerRunning
                    ? isExtraHours
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isTimerRunning
                    ? isExtraHours
                      ? 'bg-purple-500 animate-pulse'
                      : 'bg-green-500 animate-pulse'
                    : 'bg-yellow-500'
                }`} />
                {formatTimerDisplay(timerSeconds)}
                {isExtraHours && isTimerRunning && (
                  <span className="ml-1 text-[10px] uppercase font-semibold">Extra</span>
                )}
              </div>
              {/* Play button for resuming after end-of-day auto-pause */}
              {canResumeForExtraHours && (
                <button
                  onClick={handleResumeTimer}
                  disabled={isResuming}
                  className="p-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                  title="Resume timer for extra hours"
                >
                  {isResuming ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {issue.title}
      </h4>

      {/* Issue Key & Category */}
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {issue.key}
        </p>
        {issue.category && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 capitalize border border-cyan-200 dark:border-cyan-800">
            {issue.category}
          </span>
        )}
      </div>

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
