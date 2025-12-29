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
  BarChart,
  Bar,
} from 'recharts';
import { reportsAPI } from '@/lib/api';
import { Select } from '@/components/common';

interface MyCreatedTasksStatsData {
  summary: {
    total: number;
    completed: number;
    inReview: number;
    inProgress: number;
    todo: number;
    completionRate: number;
  };
  byStatus: Array<{ status: string; count: number; color: string }>;
  byType: Array<{ type: string; count: number; color: string }>;
  byPriority: Array<{ priority: string; count: number; color: string }>;
  creationTrend: Array<{ date: string; count: number; cumulative: number }>;
  completionTrend: Array<{ date: string; count: number; cumulative: number }>;
  dateRange: { start: string; end: string };
}

const TIME_RANGE_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '180', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
];

const CHART_SLIDES = [
  { id: 'created', title: 'Created by Day' },
  { id: 'completed', title: 'Completed by Day' },
  { id: 'type', title: 'By Type' },
  { id: 'priority', title: 'By Priority' },
];

export const MyCreatedTasksStats: React.FC = () => {
  const [data, setData] = useState<MyCreatedTasksStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CHART_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CHART_SLIDES.length) % CHART_SLIDES.length);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-dark-300 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
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
    { name: 'In Review', value: data.summary.inReview, color: '#8B5CF6' },
    { name: 'In Progress', value: data.summary.inProgress, color: '#3B82F6' },
    { name: 'To Do', value: data.summary.todo, color: '#6B7280' },
  ].filter((d) => d.value > 0);

  // Format trend data for charts
  const creationTrendData = data.creationTrend.map((item) => ({
    ...item,
    date: formatDate(item.date),
  }));

  const completionTrendData = (data.completionTrend || []).map((item) => ({
    ...item,
    date: formatDate(item.date),
  }));

  // Format type data for bar chart
  const typeData = data.byType.map((item) => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    count: item.count,
    fill: item.color,
  }));

  // Format priority data for bar chart
  const priorityData = data.byPriority.map((item) => ({
    name: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
    count: item.count,
    fill: item.color,
  }));

  const renderChart = () => {
    switch (CHART_SLIDES[currentSlide].id) {
      case 'created':
        return creationTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={creationTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                name="Total Created"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            No data available
          </div>
        );

      case 'completed':
        // Get last 30 days of completion data for histogram
        const last30DaysData = completionTrendData.slice(-30);
        const hasCompletedTasks = last30DaysData.some(d => d.count > 0);

        return hasCompletedTasks ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last30DaysData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 8 }}
                interval={4}
                className="dark:fill-gray-400"
              />
              <YAxis tick={{ fontSize: 10 }} className="dark:fill-gray-400" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value, 'Completed']}
              />
              <Bar
                dataKey="count"
                fill="#22C55E"
                name="Completed"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            No completed tasks yet
          </div>
        );

      case 'type':
        return typeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
              <XAxis type="number" tick={{ fontSize: 10 }} className="dark:fill-gray-400" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} className="dark:fill-gray-400" width={45} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]}>
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            No type data available
          </div>
        );

      case 'priority':
        return priorityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-600" />
              <XAxis type="number" tick={{ fontSize: 10 }} className="dark:fill-gray-400" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} className="dark:fill-gray-400" width={45} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            No priority data available
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
              My Created Tasks
            </h2>
            <div className="relative group">
              <svg
                className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="absolute left-0 top-6 w-56 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                Tasks where you are the reporter (creator). This is different from tasks assigned to you.
              </div>
            </div>
          </div>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
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

        {/* In Review */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-purple-500">
                {data.summary.inReview}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Review</p>
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

        {/* Chart Carousel */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4">
          {/* Carousel Header with Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevSlide}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-200 transition-colors"
              aria-label="Previous chart"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {CHART_SLIDES[currentSlide].title}
            </h3>
            <button
              onClick={nextSlide}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-200 transition-colors"
              aria-label="Next chart"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Chart Content */}
          <div className="transition-opacity duration-300">
            {renderChart()}
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {CHART_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide
                    ? 'bg-primary-500'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to chart ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
