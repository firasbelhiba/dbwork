'use client';

import React, { useState } from 'react';
import { Sprint, SprintStatus } from '@/types/sprint';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EditSprintModal } from './EditSprintModal';
import { sprintsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SprintListProps {
  sprints: Sprint[];
  onSprintUpdated: () => void;
}

export const SprintList: React.FC<SprintListProps> = ({ sprints, onSprintUpdated }) => {
  const [loadingSprintId, setLoadingSprintId] = useState<string | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const getStatusVariant = (status: SprintStatus) => {
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

  const handleStartSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to start this sprint? This will deactivate any other active sprints.')) {
      return;
    }

    setLoadingSprintId(sprintId);
    try {
      await sprintsAPI.start(sprintId);
      toast.success('Sprint started successfully');
      onSprintUpdated();
    } catch (error: any) {
      console.error('Error starting sprint:', error);
      toast.error(error?.response?.data?.message || 'Failed to start sprint');
    } finally {
      setLoadingSprintId(null);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to complete this sprint? This action cannot be undone.')) {
      return;
    }

    setLoadingSprintId(sprintId);
    try {
      await sprintsAPI.complete(sprintId);
      toast.success('Sprint completed successfully');
      onSprintUpdated();
    } catch (error: any) {
      console.error('Error completing sprint:', error);
      toast.error(error?.response?.data?.message || 'Failed to complete sprint');
    } finally {
      setLoadingSprintId(null);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      return;
    }

    setLoadingSprintId(sprintId);
    try {
      await sprintsAPI.delete(sprintId);
      toast.success('Sprint deleted successfully');
      onSprintUpdated();
    } catch (error: any) {
      console.error('Error deleting sprint:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete sprint');
    } finally {
      setLoadingSprintId(null);
    }
  };

  if (sprints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg font-medium">No sprints yet</p>
        <p className="text-sm mt-1">Create your first sprint to organize your work</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sprints.map((sprint) => (
        <div
          key={sprint._id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{sprint.name}</h3>
                <Badge variant={getStatusVariant(sprint.status)}>
                  {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                </Badge>
              </div>

              {sprint.goal && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{sprint.goal}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {format(new Date(sprint.startDate), 'MMM d, yyyy')} - {format(new Date(sprint.endDate), 'MMM d, yyyy')}
                  </span>
                </div>

                {sprint.status === SprintStatus.ACTIVE && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{Array.isArray(sprint.issues) ? sprint.issues.length : 0} issues</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {sprint.status === SprintStatus.PLANNED && (
                <Button
                  size="sm"
                  onClick={() => handleStartSprint(sprint._id)}
                  disabled={loadingSprintId === sprint._id}
                >
                  {loadingSprintId === sprint._id ? 'Starting...' : 'Start Sprint'}
                </Button>
              )}

              {sprint.status === SprintStatus.ACTIVE && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCompleteSprint(sprint._id)}
                  disabled={loadingSprintId === sprint._id}
                >
                  {loadingSprintId === sprint._id ? 'Completing...' : 'Complete'}
                </Button>
              )}

              {/* Edit button - available for all statuses except completed */}
              {sprint.status !== SprintStatus.COMPLETED && (
                <button
                  onClick={() => setEditingSprint(sprint)}
                  disabled={loadingSprintId === sprint._id}
                  className="p-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                  title="Edit sprint"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}

              {sprint.status !== SprintStatus.ACTIVE && (
                <button
                  onClick={() => handleDeleteSprint(sprint._id)}
                  disabled={loadingSprintId === sprint._id}
                  className="p-2 text-gray-400 hover:text-danger transition-colors disabled:opacity-50"
                  title="Delete sprint"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Edit Sprint Modal */}
      <EditSprintModal
        isOpen={editingSprint !== null}
        onClose={() => setEditingSprint(null)}
        sprint={editingSprint}
        onSprintUpdated={onSprintUpdated}
      />
    </div>
  );
};
