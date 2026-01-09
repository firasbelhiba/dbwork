'use client';

import React from 'react';

interface ChargeabilityBreakdown {
  projectId: string;
  projectName: string;
  billableHours: number;
  nonBillableHours: number;
}

interface ChargeabilityData {
  userId: string;
  userName: string;
  totalAvailableHours: number;
  totalBillableHours: number;
  totalNonBillableHours: number;
  chargeabilityPercentage: number;
  breakdown: ChargeabilityBreakdown[];
}

interface ChargeabilityCardProps {
  data: ChargeabilityData;
  showBreakdown?: boolean;
}

export const ChargeabilityCard: React.FC<ChargeabilityCardProps> = ({
  data,
  showBreakdown = true,
}) => {
  const getChargeabilityColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.userName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Chargeability Report
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${getChargeabilityColor(data.chargeabilityPercentage)}`}>
            {data.chargeabilityPercentage.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Chargeability</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(data.chargeabilityPercentage)}`}
            style={{ width: `${Math.min(100, data.chargeabilityPercentage)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-dark-500 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.totalAvailableHours.toFixed(0)}h
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.totalBillableHours.toFixed(0)}h
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Billable</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-dark-500 rounded-lg">
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {data.totalNonBillableHours.toFixed(0)}h
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Non-Billable</p>
        </div>
      </div>

      {/* Breakdown by Project */}
      {showBreakdown && data.breakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Project Breakdown
          </h4>
          <div className="space-y-3">
            {data.breakdown.map((project) => {
              const projectTotal = project.billableHours + project.nonBillableHours;
              const projectBillablePercent = projectTotal > 0
                ? (project.billableHours / projectTotal) * 100
                : 0;

              return (
                <div key={project.projectId} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {project.projectName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {projectTotal.toFixed(1)}h
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden flex">
                    {project.billableHours > 0 && (
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${projectBillablePercent}%` }}
                        title={`Billable: ${project.billableHours.toFixed(1)}h`}
                      />
                    )}
                    {project.nonBillableHours > 0 && (
                      <div
                        className="h-full bg-gray-400"
                        style={{ width: `${100 - projectBillablePercent}%` }}
                        title={`Non-Billable: ${project.nonBillableHours.toFixed(1)}h`}
                      />
                    )}
                  </div>
                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:flex gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Billable: {project.billableHours.toFixed(1)}h</span>
                    <span>Non-Billable: {project.nonBillableHours.toFixed(1)}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-300">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-500 dark:text-gray-400">Billable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">Non-Billable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
