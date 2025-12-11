'use client';

import React, { useState, useEffect } from 'react';
import { activitiesAPI } from '@/lib/api';
import { LogoLoader } from '@/components/common';

// Simple avatar component
const UserAvatar: React.FC<{ src: string | null; name: string; size?: 'sm' | 'md' }> = ({ src, name, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (src) {
    return <img src={src} alt={name} className={`${sizeClasses} rounded-full object-cover`} />;
  }

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${sizeClasses} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center`}>
      <span className={`${textSize} font-medium text-primary-600 dark:text-primary-400`}>{initials}</span>
    </div>
  );
};

interface ActivityAnalyticsData {
  summary: {
    totalActivities: number;
    activitiesInPeriod: number;
    uniqueUsers: number;
    uniqueProjects: number;
  };
  byActionType: Array<{ action: string; count: number }>;
  byEntityType: Array<{ entityType: string; count: number }>;
  byUser: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    count: number;
    entityBreakdown: Array<{ entityType: string; count: number; percentage: number }>;
  }>;
  byProject: Array<{ projectId: string; projectName: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  recentActivities: Array<{
    _id: string;
    action: string;
    entityType: string;
    entityName: string;
    createdAt: string;
    userId: { _id: string; firstName: string; lastName: string; avatar: string | null } | null;
    projectId: { _id: string; name: string; key: string } | null;
  }>;
}

interface ActivitiesTabProps {
  startDate: string;
  endDate: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  commented: 'Commented',
  added_member: 'Added Member',
  removed_member: 'Removed Member',
  started: 'Started',
  completed: 'Completed',
  archived: 'Archived',
  restored: 'Restored',
  assigned: 'Assigned',
  status_changed: 'Status Changed',
  priority_changed: 'Priority Changed',
  published: 'Published',
};

const ENTITY_LABELS: Record<string, string> = {
  issue: 'Issues',
  project: 'Projects',
  sprint: 'Sprints',
  comment: 'Comments',
  user: 'Users',
  feedback: 'Feedback',
  changelog: 'Changelogs',
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  commented: 'bg-purple-500',
  added_member: 'bg-teal-500',
  removed_member: 'bg-orange-500',
  started: 'bg-emerald-500',
  completed: 'bg-indigo-500',
  archived: 'bg-gray-500',
  restored: 'bg-cyan-500',
  assigned: 'bg-yellow-500',
  status_changed: 'bg-pink-500',
  priority_changed: 'bg-amber-500',
  published: 'bg-violet-500',
};

const ENTITY_COLORS: Record<string, string> = {
  issue: 'bg-blue-500',
  project: 'bg-purple-500',
  sprint: 'bg-green-500',
  comment: 'bg-orange-500',
  user: 'bg-pink-500',
  feedback: 'bg-yellow-500',
  changelog: 'bg-indigo-500',
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<ActivityAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await activitiesAPI.getAnalytics(startDate, endDate);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching activity analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LogoLoader size="md" text="Loading activity analytics" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Failed to load activity analytics
      </div>
    );
  }

  const maxDailyCount = Math.max(...data.dailyTrend.map((d) => d.count), 1);
  const maxActionCount = Math.max(...data.byActionType.map((d) => d.count), 1);
  const maxEntityCount = Math.max(...data.byEntityType.map((d) => d.count), 1);
  const maxUserCount = Math.max(...data.byUser.map((d) => d.count), 1);
  const maxProjectCount = Math.max(...data.byProject.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activities in Period</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.activitiesInPeriod.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.uniqueUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Projects Touched</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.uniqueProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalActivities.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      {data.dailyTrend.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Trend</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {data.dailyTrend.reduce((sum, d) => sum + d.count, 0)} activities
            </span>
          </div>
          <div className="h-56 flex items-end gap-2 pb-8 relative">
            {data.dailyTrend.map((day, index) => {
              const heightPercent = maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center relative group">
                  {/* Count label on top */}
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.count}
                  </span>
                  {/* Bar */}
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-400 cursor-pointer"
                      style={{
                        height: day.count > 0 ? `${Math.max(heightPercent, 8)}%` : '2px',
                        backgroundColor: day.count === 0 ? '#e5e7eb' : undefined
                      }}
                      title={`${formatDate(day.date)}: ${day.count} activities`}
                    >
                      {/* Show count inside bar if tall enough */}
                      {heightPercent > 20 && (
                        <span className="text-xs font-bold text-white w-full text-center block pt-1">
                          {day.count}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Date label */}
                  <span className="absolute -bottom-6 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap transform -rotate-45 origin-top-left">
                    {formatDate(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Max: {maxDailyCount} activities/day</span>
            <span>Avg: {Math.round(data.dailyTrend.reduce((sum, d) => sum + d.count, 0) / data.dailyTrend.length)} activities/day</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Action Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Action Type</h3>
          <div className="space-y-3">
            {data.byActionType.map((item) => (
              <div key={item.action} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${ACTION_COLORS[item.action] || 'bg-gray-500'}`} />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {ACTION_LABELS[item.action] || item.action}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${ACTION_COLORS[item.action] || 'bg-gray-500'}`}
                      style={{ width: `${(item.count / maxActionCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
            {data.byActionType.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No activities in this period</p>
            )}
          </div>
        </div>

        {/* By Entity Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Entity Type</h3>
          <div className="space-y-3">
            {data.byEntityType.map((item) => (
              <div key={item.entityType} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${ENTITY_COLORS[item.entityType] || 'bg-gray-500'}`} />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {ENTITY_LABELS[item.entityType] || item.entityType}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${ENTITY_COLORS[item.entityType] || 'bg-gray-500'}`}
                      style={{ width: `${(item.count / maxEntityCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
            {data.byEntityType.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No activities in this period</p>
            )}
          </div>
        </div>
      </div>

      {/* Most Active Users with Entity Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Active Users</h3>
        <div className="space-y-4">
          {data.byUser.map((user, index) => (
            <div key={user.userId} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  #{index + 1}
                </span>
                <UserAvatar
                  src={user.userAvatar}
                  name={user.userName}
                  size="sm"
                />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.userName}
                </span>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {user.count} activities
                </span>
              </div>
              {/* Entity Breakdown */}
              <div className="ml-14 flex flex-wrap gap-2">
                {user.entityBreakdown
                  .sort((a, b) => b.percentage - a.percentage)
                  .map((entity) => (
                    <span
                      key={entity.entityType}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        entity.entityType === 'issue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        entity.entityType === 'comment' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        entity.entityType === 'project' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        entity.entityType === 'sprint' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        entity.entityType === 'feedback' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        entity.entityType === 'changelog' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {ENTITY_LABELS[entity.entityType] || entity.entityType}: {entity.percentage}%
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {data.byUser.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No user activity in this period</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Active Projects</h3>
          <div className="space-y-3">
            {data.byProject.map((project, index) => (
              <div key={project.projectId} className="flex items-center gap-3">
                <span className="w-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  #{index + 1}
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {project.projectName}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{ width: `${(project.count / maxProjectCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                    {project.count}
                  </span>
                </div>
              </div>
            ))}
            {data.byProject.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No project activity in this period</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activities</h3>
        <div className="space-y-4">
          {data.recentActivities.map((activity) => (
            <div key={activity._id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
              <UserAvatar
                src={activity.userId?.avatar || null}
                name={activity.userId ? `${activity.userId.firstName} ${activity.userId.lastName}` : 'Unknown'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">
                    {activity.userId ? `${activity.userId.firstName} ${activity.userId.lastName}` : 'Unknown User'}
                  </span>
                  {' '}
                  <span className="text-gray-500 dark:text-gray-400">
                    {ACTION_LABELS[activity.action] || activity.action}
                  </span>
                  {' '}
                  <span className="font-medium">{activity.entityName}</span>
                  {activity.projectId && (
                    <>
                      {' '}
                      <span className="text-gray-500 dark:text-gray-400">in</span>
                      {' '}
                      <span className="text-purple-600 dark:text-purple-400">{activity.projectId.name}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {getTimeAgo(activity.createdAt)} - {formatDateTime(activity.createdAt)}
                </p>
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full text-white ${ACTION_COLORS[activity.action] || 'bg-gray-500'}`}>
                {ENTITY_LABELS[activity.entityType] || activity.entityType}
              </span>
            </div>
          ))}
          {data.recentActivities.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );
};
