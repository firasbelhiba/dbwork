'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { reportsAPI } from '@/lib/api';
import { Select } from '@/components/common';

interface MyCreatedTasksStatsData {
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    completionRate: number;
  };
  byStatus: Array<{ status: string; count: number; color: string }>;
  byType: Array<{ type: string; count: number; color: string }>;
  byPriority: Array<{ priority: string; count: number; color: string }>;
  creationTrend: Array<{ date: string; count: number; cumulative: number }>;
  dateRange: { start: string; end: string };
}

const TIME_RANGE_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '180', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
];

export const MyCreatedTasksStats: React.FC = () => {
  const [data, setData] = useState<MyCreatedTasksStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportsAPI.getMyCreatedTasksStats(timeRange);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = () => {
    if (!data?.dateRange?.start) return '';
    const start = new Date(data.dateRange.start);
    return `since ${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-dark-300 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-dark-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6">
        <div className="text-center text-red-500 dark:text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-primary-500 hover:text-primary-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.summary.total === 0) {
    return (
      <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
              My Created Tasks
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{formatDateRange()}</p>
          </div>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full sm:w-40"
          >
            {TIME_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-sm">No tasks created yet</p>
          <p className="text-xs mt-1">Start creating tasks to see your progress here</p>
        </div>
      </div>
    );
  }

  // Prepare pie chart data for status distribution
  const statusPieData = [
    { name: 'Completed', value: data.summary.completed, color: '#22C55E' },
    { name: 'In Progress', value: data.summary.inProgress, color: '#3B82F6' },
    { name: 'To Do', value: data.summary.todo, color: '#6B7280' },
  ].filter((d) => d.value > 0);

  // Format trend data for chart
  const trendData = data.creationTrend.map((item) => ({
    ...item,
    date: formatDate(item.date),
  }));

  return (
    <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
            My Created Tasks
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{formatDateRange()}</p>
        </div>
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="w-full sm:w-40"
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {/* Total */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 md:w-5 md:h-5 text-primary-600 dark:text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 md:w-5 md:h-5 text-success-600 dark:text-success-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-success-500">
                {data.summary.completed}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Completed ({data.summary.completionRate}%)
              </p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-blue-500">
                {data.summary.inProgress}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
            </div>
          </div>
        </div>

        {/* To Do */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-500 dark:text-gray-400">
                {data.summary.todo}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">To Do</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {statusPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {/* Completion Rate in Center */}
          <div className="text-center -mt-32 mb-20 pointer-events-none">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.summary.completionRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complete</p>
          </div>
        </div>

        {/* Creation Trend Chart */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Creation Trend
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  className="dark:fill-gray-400"
                />
                <YAxis tick={{ fontSize: 10 }} className="dark:fill-gray-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3B82F6"
                  fill="url(#colorCreated)"
                  name="Total Tasks"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
              No trend data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
