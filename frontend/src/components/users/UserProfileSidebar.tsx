'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from '@/types/user';
import { Badge } from '@/components/common';
import { UserAvatar } from '@/components/common/UserAvatar';
import { formatDateTime, getRelativeTime } from '@/lib/utils';
import { issuesAPI } from '@/lib/api';
import { TicketCalendar } from './TicketCalendar';

interface WorkloadData {
  totalInProgress: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    projectKey: string;
    issues: Array<{
      _id: string;
      key: string;
      title: string;
      status: string;
      priority: string;
      type: string;
    }>;
  }>;
}

interface BandwidthData {
  projects: Array<{
    _id: string;
    key: string;
    name: string;
    logo?: string;
  }>;
  bandwidth: {
    daily: {
      worked: number;
      target: number;
      remaining: number;
      percentage: number;
    };
    weekly: {
      worked: number;
      target: number;
      remaining: number;
      percentage: number;
    };
    monthly: {
      worked: number;
      target: number;
      remaining: number;
      percentage: number;
    };
  };
  activeTimer: {
    issueKey: string;
    issueTitle: string;
    projectKey: string;
    startedAt: string;
    isPaused: boolean;
  } | null;
}

interface UserProfileSidebarProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [bandwidth, setBandwidth] = useState<BandwidthData | null>(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [loadingBandwidth, setLoadingBandwidth] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      fetchWorkload();
      fetchBandwidth();
    }
  }, [user?._id, isOpen]);

  const fetchWorkload = async () => {
    if (!user) return;
    setLoadingWorkload(true);
    try {
      const response = await issuesAPI.getUserWorkload(user._id);
      setWorkload(response.data);
    } catch (error) {
      console.error('Error fetching user workload:', error);
    } finally {
      setLoadingWorkload(false);
    }
  };

  const fetchBandwidth = async () => {
    if (!user) return;
    setLoadingBandwidth(true);
    try {
      const response = await issuesAPI.getUserBandwidth(user._id);
      setBandwidth(response.data);
    } catch (error) {
      console.error('Error fetching user bandwidth:', error);
    } finally {
      setLoadingBandwidth(false);
    }
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return '0h';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getBandwidthColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-success-500';
    if (percentage >= 75) return 'bg-primary-500';
    if (percentage >= 50) return 'bg-warning-500';
    return 'bg-gray-300 dark:bg-gray-600';
  };

  if (!user) return null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'critical';
      case 'project_manager':
        return 'high';
      case 'developer':
        return 'medium';
      case 'viewer':
        return 'low';
      default:
        return 'default';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return (
          <svg className="w-4 h-4 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.56 1.14a.75.75 0 01.177 1.045 3.989 3.989 0 00-.464.86c.185.17.382.329.59.473A3.993 3.993 0 0110 2c1.272 0 2.405.594 3.137 1.518.208-.144.405-.302.59-.473a3.989 3.989 0 00-.464-.86.75.75 0 011.222-.869c.369.519.65 1.105.822 1.736a.75.75 0 01-.174.707 7.03 7.03 0 01-1.299 1.098A4 4 0 0114 6c0 .52-.301.963-.723 1.187a6.961 6.961 0 01-.172 3.223 6.87 6.87 0 01-1.267 2.37l1.108 1.109a.75.75 0 01-1.06 1.06l-1.109-1.108a6.87 6.87 0 01-2.37 1.267 6.961 6.961 0 01-3.223.172A1.28 1.28 0 016 16a4 4 0 01-.166-1.833 7.03 7.03 0 01-1.098-1.299.75.75 0 01.707-.174c.631.172 1.217.453 1.736.822a.75.75 0 01-.869 1.222 3.989 3.989 0 00-.86-.464c.144.208.302.405.473.59A3.993 3.993 0 012 10c0-1.272.594-2.405 1.518-3.137a5.023 5.023 0 01-.473-.59 3.989 3.989 0 00.86.464.75.75 0 01.869-1.222 4.97 4.97 0 01-1.736-.822.75.75 0 01-.174-.707c.172-.631.453-1.217.822-1.736a.75.75 0 011.045-.177z" clipRule="evenodd" />
          </svg>
        );
      case 'task':
        return (
          <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'story':
        return (
          <svg className="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-dark-400 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Profile Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-73px)]">
          {/* Profile Section */}
          <div className="px-6 py-8 border-b border-gray-200 dark:border-dark-300">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="mb-4">
                <UserAvatar
                  userId={user._id}
                  avatar={user.avatar}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size="2xl"
                  showOnlineStatus={true}
                  className="shadow-lg"
                />
              </div>

              {/* Name */}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
                {user.firstName} {user.lastName}
              </h3>

              {/* Email */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {user.email}
              </p>

              {/* Role Badge */}
              <Badge variant={getRoleBadgeVariant(user.role) as any}>
                {formatRole(user.role)}
              </Badge>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Bandwidth Section */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-dark-300">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
              Availability
            </h4>

            {loadingBandwidth ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : bandwidth ? (
              <div className="space-y-4">
                {/* Daily */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatHours(bandwidth.bandwidth.daily.worked)} / {bandwidth.bandwidth.daily.target}h
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBandwidthColor(bandwidth.bandwidth.daily.percentage)}`}
                      style={{ width: `${Math.min(100, bandwidth.bandwidth.daily.percentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {bandwidth.bandwidth.daily.remaining > 0
                      ? `${formatHours(bandwidth.bandwidth.daily.remaining)} remaining`
                      : 'Target reached!'}
                  </p>
                </div>

                {/* Weekly */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatHours(bandwidth.bandwidth.weekly.worked)} / {bandwidth.bandwidth.weekly.target}h
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBandwidthColor(bandwidth.bandwidth.weekly.percentage)}`}
                      style={{ width: `${Math.min(100, bandwidth.bandwidth.weekly.percentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {bandwidth.bandwidth.weekly.remaining > 0
                      ? `${formatHours(bandwidth.bandwidth.weekly.remaining)} remaining`
                      : 'Target reached!'}
                  </p>
                </div>

                {/* Monthly */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatHours(bandwidth.bandwidth.monthly.worked)} / {bandwidth.bandwidth.monthly.target}h
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-dark-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBandwidthColor(bandwidth.bandwidth.monthly.percentage)}`}
                      style={{ width: `${Math.min(100, bandwidth.bandwidth.monthly.percentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {bandwidth.bandwidth.monthly.remaining > 0
                      ? `${formatHours(bandwidth.bandwidth.monthly.remaining)} remaining`
                      : 'Target reached!'}
                  </p>
                </div>

                {/* Active Timer indicator */}
                {bandwidth.activeTimer && (
                  <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${bandwidth.activeTimer.isPaused ? 'bg-warning-500' : 'bg-success-500 animate-pulse'}`} />
                      <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                        {bandwidth.activeTimer.isPaused ? 'Timer Paused' : 'Timer Running'}
                      </span>
                    </div>
                    <Link
                      href={`/issues/${bandwidth.activeTimer.issueKey}`}
                      onClick={onClose}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-1 block truncate"
                    >
                      {bandwidth.activeTimer.issueKey}: {bandwidth.activeTimer.issueTitle}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No data available
              </p>
            )}
          </div>

          {/* Projects Section */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-dark-300">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
              Assigned Projects
            </h4>

            {loadingBandwidth ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : bandwidth && bandwidth.projects.length > 0 ? (
              <div className="space-y-2">
                {bandwidth.projects.map((project) => (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors group"
                  >
                    {project.logo ? (
                      <img
                        src={project.logo}
                        alt={project.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                          {project.key.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{project.key}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">Not assigned to any projects</p>
              </div>
            )}
          </div>

          {/* Availability Calendar Section */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-dark-300">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
              Ticket Calendar
            </h4>
            <TicketCalendar userId={user._id} />
          </div>

          {/* Current Tasks Section (condensed) */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-dark-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Active Tasks
              </h4>
              {workload && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                  {workload.totalInProgress}
                </span>
              )}
            </div>

            {loadingWorkload ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : workload && workload.byProject.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {workload.byProject.flatMap((project) =>
                  project.issues.map((issue) => (
                    <Link
                      key={issue._id}
                      href={`/issues/${issue.key}`}
                      onClick={onClose}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors group"
                    >
                      {getTypeIcon(issue.type)}
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {issue.key}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {issue.title}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">No active tasks</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="px-6 py-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
              Account Information
            </h4>

            <div className="space-y-4">
              {/* Member Since */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Member Since
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDateTime(user.createdAt)}
                </p>
              </div>

              {/* Last Login */}
              {user.lastLoginAt && (
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Last Login
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getRelativeTime(user.lastLoginAt)}
                  </p>
                </div>
              )}

              {/* Account Status */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive
                      ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
