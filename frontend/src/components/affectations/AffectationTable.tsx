'use client';

import React, { useState } from 'react';
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

const statusConfig: Record<AffectationStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  planned: {
    label: 'Planned',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  active: {
    label: 'Active',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  completed: {
    label: 'Completed',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
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
    const status = statusConfig[aff.status];

    return (
      <tr
        key={aff._id}
        className="group hover:bg-gray-50 dark:hover:bg-dark-500/50 transition-colors"
      >
        {showProject && (
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              {project?.logo ? (
                <img
                  src={project.logo}
                  alt={project.name}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-dark-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 flex items-center justify-center ring-1 ring-primary-200 dark:ring-primary-800">
                  <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                    {project?.key?.substring(0, 2) || '??'}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {project?.name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {project?.key}
                </p>
              </div>
            </div>
          </td>
        )}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-dark-400"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white dark:ring-dark-400">
                <span className="text-sm font-bold text-white">
                  {user?.firstName?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300">
            {aff.role}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <div className="text-sm">
            <p className="text-gray-900 dark:text-white font-medium">
              {formatDate(aff.startDate)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              to {formatDate(aff.endDate)}
            </p>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 relative">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200 dark:text-dark-300"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(aff.allocationPercentage / 100) * 125.6} 125.6`}
                  className="text-primary-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                {aff.allocationPercentage}%
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {aff.actualHours}h
              </span>
              <span className="text-gray-400 dark:text-gray-500">
                / {aff.estimatedHours}h
              </span>
            </div>
            <div className="w-28 h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progressPercent >= 100
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : progressPercent >= 75
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            {progressPercent >= 100 && (
              <p className="text-[10px] text-red-500 font-medium">Over budget</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex flex-col gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${status.bgColor} ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
            {/* Billable indicator */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded ${
              aff.isBillable
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {aff.isBillable ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Billable
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Internal
                </>
              )}
            </span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleSyncHours(aff._id)}
              disabled={syncingId === aff._id}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Sync hours from time tracking"
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
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit affectation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(aff)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete affectation"
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
    // Calculate project totals
    const getProjectTotals = (affectations: Affectation[]) => {
      const totalEstimated = affectations.reduce((sum, a) => sum + a.estimatedHours, 0);
      const totalActual = affectations.reduce((sum, a) => sum + a.actualHours, 0);
      const activeCount = affectations.filter(a => a.status === 'active').length;
      return { totalEstimated, totalActual, activeCount };
    };

    return (
      <div className="space-y-6">
        {Object.entries(groupedAffectations).map(([projectId, group]) => {
          const totals = getProjectTotals(group.affectations);
          return (
            <div
              key={projectId}
              className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden"
            >
              {/* Project Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-dark-500 dark:to-dark-400 border-b border-gray-200 dark:border-dark-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {group.projectKey?.substring(0, 2) || group.projectName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {group.projectName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-mono">{group.projectKey}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>{group.affectations.length} team member{group.affectations.length !== 1 ? 's' : ''}</span>
                        {totals.activeCount > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{totals.activeCount} active</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Project Summary Stats */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Estimated</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.totalEstimated}h</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-dark-300" />
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Actual</p>
                      <p className={`text-lg font-bold ${totals.totalActual > totals.totalEstimated ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {totals.totalActual}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-dark-300">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Team Member
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Allocation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-300">
                    {group.affectations.map((aff) => renderAffectationRow(aff, false))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Flat table view
  return (
    <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-dark-500 border-b border-gray-100 dark:border-dark-300">
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Team Member
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Period
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Allocation
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-300">
            {affectations.map((aff) => renderAffectationRow(aff, true))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
