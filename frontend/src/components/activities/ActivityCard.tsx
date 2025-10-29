'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ActionType, EntityType } from '@/types/activity';
import { formatDistanceToNow } from 'date-fns';

interface ActivityCardProps {
  activity: Activity;
  showProject?: boolean;
}

const actionColors: Record<ActionType, string> = {
  [ActionType.CREATED]: 'bg-green-100 text-green-800',
  [ActionType.UPDATED]: 'bg-blue-100 text-blue-800',
  [ActionType.DELETED]: 'bg-red-100 text-red-800',
  [ActionType.COMMENTED]: 'bg-purple-100 text-purple-800',
  [ActionType.ADDED_MEMBER]: 'bg-teal-100 text-teal-800',
  [ActionType.REMOVED_MEMBER]: 'bg-orange-100 text-orange-800',
  [ActionType.STARTED]: 'bg-indigo-100 text-indigo-800',
  [ActionType.COMPLETED]: 'bg-emerald-100 text-emerald-800',
  [ActionType.ARCHIVED]: 'bg-gray-100 text-gray-800',
  [ActionType.RESTORED]: 'bg-cyan-100 text-cyan-800',
  [ActionType.ASSIGNED]: 'bg-yellow-100 text-yellow-800',
  [ActionType.STATUS_CHANGED]: 'bg-blue-100 text-blue-800',
  [ActionType.PRIORITY_CHANGED]: 'bg-pink-100 text-pink-800',
};

const actionLabels: Record<ActionType, string> = {
  [ActionType.CREATED]: 'Created',
  [ActionType.UPDATED]: 'Updated',
  [ActionType.DELETED]: 'Deleted',
  [ActionType.COMMENTED]: 'Commented on',
  [ActionType.ADDED_MEMBER]: 'Added member to',
  [ActionType.REMOVED_MEMBER]: 'Removed member from',
  [ActionType.STARTED]: 'Started',
  [ActionType.COMPLETED]: 'Completed',
  [ActionType.ARCHIVED]: 'Archived',
  [ActionType.RESTORED]: 'Restored',
  [ActionType.ASSIGNED]: 'Assigned',
  [ActionType.STATUS_CHANGED]: 'Changed status of',
  [ActionType.PRIORITY_CHANGED]: 'Changed priority of',
};

const entityIcons: Record<EntityType, string> = {
  [EntityType.ISSUE]: '📋',
  [EntityType.PROJECT]: '📁',
  [EntityType.SPRINT]: '🏃',
  [EntityType.COMMENT]: '💬',
  [EntityType.USER]: '👤',
};

const getEntityLink = (activity: Activity): string | null => {
  switch (activity.entityType) {
    case EntityType.ISSUE:
      return `/issues/${activity.entityId}`;
    case EntityType.PROJECT:
      return `/projects/${activity.entityId}`;
    case EntityType.SPRINT:
      return `/sprints/${activity.entityId}`;
    default:
      return null;
  }
};

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, showProject = true }) => {
  const entityLink = getEntityLink(activity);
  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });

  const renderMetadata = () => {
    if (!activity.metadata) return null;

    if (activity.action === ActionType.STATUS_CHANGED && activity.metadata.status) {
      return (
        <div className="mt-1 text-xs text-gray-600">
          <span className="font-medium">{activity.metadata.status.from}</span>
          {' → '}
          <span className="font-medium">{activity.metadata.status.to}</span>
        </div>
      );
    }

    if (activity.action === ActionType.PRIORITY_CHANGED && activity.metadata.priority) {
      return (
        <div className="mt-1 text-xs text-gray-600">
          <span className="font-medium">{activity.metadata.priority.from}</span>
          {' → '}
          <span className="font-medium">{activity.metadata.priority.to}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {activity.userId.avatar ? (
          <img
            src={activity.userId.avatar}
            alt={`${activity.userId.firstName} ${activity.userId.lastName}`}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {activity.userId.firstName[0]}
            {activity.userId.lastName[0]}
          </div>
        )}
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* User Name and Action */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">
                {activity.userId.firstName} {activity.userId.lastName}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  actionColors[activity.action]
                }`}
              >
                {actionLabels[activity.action]}
              </span>
            </div>

            {/* Entity */}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg">{entityIcons[activity.entityType]}</span>
              {entityLink ? (
                <Link
                  href={entityLink}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
                >
                  {activity.entityName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-700 truncate">
                  {activity.entityName}
                </span>
              )}
            </div>

            {/* Metadata */}
            {renderMetadata()}

            {/* Project */}
            {showProject && activity.projectId && (
              <div className="mt-1">
                <Link
                  href={`/projects/${activity.projectId._id}`}
                  className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                >
                  <span className="mr-1">📁</span>
                  {activity.projectId.name}
                </Link>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0">
            <span className="text-xs text-gray-500" title={new Date(activity.createdAt).toLocaleString()}>
              {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
