'use client';

import React, { useState } from 'react';
import { Button, Badge } from '@/components/common';
import { Affectation, AffectationStatus } from '@/types/affectation';
import { affectationsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface AffectationTableProps {
  affectations: Affectation[];
  onEdit: (affectation: Affectation) => void;
  onDelete: (affectation: Affectation) => void;
  onRefresh: () => void;
  groupByProject?: boolean;
}

const statusColors: Record<AffectationStatus, string> = {
  planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const AffectationTable: React.FC<AffectationTableProps> = ({
  affectations,
  onEdit,
  onDelete,
  onRefresh,
  groupByProject = true,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSyncHours = async (id: string) => {
    try {
      setSyncingId(id);
      const response = await affectationsAPI.syncHours(id);
      toast.success(`Hours synced: ${response.data.actualHours}h`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to sync hours');
    } finally {
      setSyncingId(null);
    }
  };

  const getProgressPercent = (actual: number, estimated: number) => {
    if (!estimated) return 0;
    return Math.min(100, Math.round((actual / estimated) * 100));
  };

  // Group affectations by project if enabled
  const groupedAffectations = groupByProject
    ? affectations.reduce((acc, aff) => {
        const projectId = typeof aff.projectId === 'object' ? aff.projectId._id : aff.projectId;
        const projectName = typeof aff.projectId === 'object' ? aff.projectId.name : 'Unknown';
        const projectKey = typeof aff.projectId === 'object' ? aff.projectId.key : '';

        if (!acc[projectId]) {
          acc[projectId] = {
            projectName,
            projectKey,
            affectations: [],
          };
        }
        acc[projectId].affectations.push(aff);
        return acc;
      }, {} as Record<string, { projectName: string; projectKey: string; affectations: Affectation[] }>)
    : null;

  if (affectations.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-dark-400 rounded-lg">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
          No affectations found
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Create your first affectation to get started
        </p>
      </div>
    );
  }

  const renderAffectationRow = (aff: Affectation, showProject: boolean = false) => {
    const user = typeof aff.userId === 'object' ? aff.userId : null;
    const project = typeof aff.projectId === 'object' ? aff.projectId : null;
    const progressPercent = getProgressPercent(aff.actualHours, aff.estimatedHours);

    return (
      <tr
        key={aff._id}
        className="hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors"
      >
        {showProject && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {project?.logo ? (
                <img
                  src={project.logo}
                  alt={project.name}
                  className="w-6 h-6 rounded"
                />
              ) : (
                <div className="w-6 h-6 rounded bg-gray-200 dark:bg-dark-300 flex items-center justify-center text-xs font-bold">
                  {project?.name?.charAt(0) || '?'}
                </div>
              )}
              <span className="font-medium text-gray-900 dark:text-white">
                {project?.name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({project?.key})
              </span>
            </div>
          </td>
        )}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-400">
                  {user?.firstName?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <span className="text-gray-900 dark:text-white">
              {user ? `${user.firstName} ${user.lastName}` : 'Unknown'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">{aff.role}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatDate(aff.startDate)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatDate(aff.endDate)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {aff.allocationPercentage}%
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {aff.actualHours}h / {aff.estimatedHours}h
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {progressPercent}%
              </span>
            </div>
            <div className="w-24 h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercent >= 100
                    ? 'bg-red-500'
                    : progressPercent >= 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[aff.status]}`}
          >
            {aff.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSyncHours(aff._id)}
              disabled={syncingId === aff._id}
              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors disabled:opacity-50"
              title="Sync hours"
            >
              {syncingId === aff._id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
            <button
              onClick={() => onEdit(aff)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(aff)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (groupByProject && groupedAffectations) {
    return (
      <div className="space-y-6">
        {Object.entries(groupedAffectations).map(([projectId, group]) => (
          <div
            key={projectId}
            className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden"
          >
            {/* Project Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-dark-500 border-b border-gray-200 dark:border-dark-300">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                    {group.projectName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {group.projectName}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {group.projectKey} - {group.affectations.length} member{group.affectations.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-500">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Start
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      End
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Alloc.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-300">
                  {group.affectations.map((aff) => renderAffectationRow(aff, false))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Flat table view
  return (
    <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-dark-500">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                End
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Alloc.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-300">
            {affectations.map((aff) => renderAffectationRow(aff, true))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
