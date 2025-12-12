'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { reportsAPI } from '@/lib/api';
import { LogoLoader } from '@/components/common';

interface TicketBreakdown {
  issueKey: string;
  issueTitle: string;
  projectKey: string;
  seconds: number;
  hours: number;
  isExtra: boolean;
  startTime: string;
  endTime: string;
}

interface DailyData {
  odataKey: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  date: string;
  hoursWorked: number;
  regularHours: number;
  extraHours: number;
  target: number;
  diff: number;
  status: 'on_track' | 'under' | 'over';
  tickets: TicketBreakdown[];
}

interface TimeAttendanceData {
  dailyData: DailyData[];
  summary: {
    totalHours: number;
    avgDailyHours: number;
    totalExtraHours: number;
    usersUnderTarget: number;
    totalUsers: number;
    workingDays: number;
  };
  alertUsers: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    underDays: number;
  }>;
}

interface UserGroupedData {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalHoursWorked: number;
  totalExtraHours: number;
  totalTarget: number;
  totalDiff: number;
  daysWorked: number;
  daysUnder: number;
  daysOver: number;
  days: DailyData[];
}

interface TimeAttendanceTabProps {
  startDate: string;
  endDate: string;
}

const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Calculate 24-hour activity distribution
const calculate24HourDistribution = (days: DailyData[]): number[] => {
  const hourlyMinutes: number[] = new Array(24).fill(0);

  days.forEach((day) => {
    day.tickets?.forEach((ticket) => {
      const start = new Date(ticket.startTime);
      const end = new Date(ticket.endTime);

      let current = new Date(start);
      while (current < end) {
        const hour = current.getHours();
        hourlyMinutes[hour] += 1;
        current = new Date(current.getTime() + 60000);
      }
    });
  });

  return hourlyMinutes;
};

// Activity Wave Chart Component (Full size for modal)
const ActivityWaveChart: React.FC<{ hourlyData: number[]; userName: string }> = ({ hourlyData, userName }) => {
  const width = 800;
  const height = 200;
  const padding = 50;
  const waveHeight = 60;
  const centerY = height / 2;

  // Normalize data for dot sizes
  const maxMinutes = Math.max(...hourlyData, 1);

  // Generate wave path and dots
  // Wave goes: 06:00 (left, middle) → 12:00 (top) → 18:00 (middle) → 24:00 (bottom) → 06:00 (right, middle)
  const getWaveY = (hour: number): number => {
    // Shift hours so 6am is at start, then 12, 18, 0, 6
    const adjustedHour = (hour + 18) % 24; // Makes 6am = 0, 12pm = 6, 6pm = 12, midnight = 18
    const progress = adjustedHour / 24;
    // Sine wave: peaks at 12:00 (progress ~0.25), troughs at midnight (progress ~0.75)
    return centerY - Math.sin(progress * 2 * Math.PI) * waveHeight;
  };

  const getX = (index: number): number => {
    return padding + (index / 24) * (width - 2 * padding);
  };

  // Reorder hours: 6, 7, 8, ... 23, 0, 1, 2, 3, 4, 5
  const orderedHours = [...Array(24)].map((_, i) => (i + 6) % 24);

  // Generate smooth wave path
  const pathPoints = orderedHours.map((hour, index) => {
    const x = getX(index);
    const y = getWaveY(hour);
    return { x, y, hour };
  });

  // Create smooth curve through points
  const pathD = pathPoints.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = pathPoints[index - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} Q ${cpX} ${prev.y} ${point.x} ${point.y}`;
  }, '');

  // Time labels
  const timeLabels = [
    { hour: 6, label: '06:00' },
    { hour: 12, label: '12:00' },
    { hour: 18, label: '18:00' },
    { hour: 0, label: '24:00' },
    { hour: 6, label: '06:00', isEnd: true },
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height + 40}`} className="w-full h-auto">
        {/* Gradient for wave */}
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#FBBF24" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#F97316" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#6366F1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Wave line */}
        <path
          d={pathD}
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeOpacity="0.5"
        />

        {/* Activity dots */}
        {pathPoints.map((point, index) => {
          const hour = orderedHours[index];
          const minutes = hourlyData[hour];
          const normalizedSize = minutes / maxMinutes;
          const baseSize = 6;
          const maxSize = 18;
          const size = baseSize + normalizedSize * (maxSize - baseSize);
          const opacity = 0.3 + normalizedSize * 0.7;

          return (
            <g key={`dot-${index}`}>
              {/* Glow effect for active hours */}
              {minutes > 0 && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={size + 4}
                  fill="#9CA3AF"
                  opacity={opacity * 0.3}
                />
              )}
              <circle
                cx={point.x}
                cy={point.y}
                r={size}
                fill={minutes > 0 ? '#9CA3AF' : '#4B5563'}
                opacity={minutes > 0 ? opacity : 0.4}
              />
              {/* Show time on hover - title tooltip */}
              <title>{`${hour.toString().padStart(2, '0')}:00 - ${Math.round(minutes)} min`}</title>
            </g>
          );
        })}

        {/* Sun icon at noon (peak) */}
        <g transform={`translate(${getX(6)}, ${centerY - waveHeight - 15})`}>
          <circle cx="0" cy="0" r="8" fill="#F97316" />
          {/* Sun rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1={Math.cos((angle * Math.PI) / 180) * 11}
              y1={Math.sin((angle * Math.PI) / 180) * 11}
              x2={Math.cos((angle * Math.PI) / 180) * 16}
              y2={Math.sin((angle * Math.PI) / 180) * 16}
              stroke="#F97316"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Sunrise icon at 6am (left) */}
        <g transform={`translate(${padding - 5}, ${centerY})`}>
          <circle cx="0" cy="0" r="6" fill="#F97316" />
          <line x1="-10" y1="8" x2="10" y2="8" stroke="#F97316" strokeWidth="2" />
        </g>

        {/* Sunset icon at 6pm */}
        <g transform={`translate(${getX(12)}, ${centerY})`}>
          <circle cx="0" cy="-8" r="6" fill="#F97316" />
        </g>

        {/* Moon icon at midnight (bottom) */}
        <g transform={`translate(${getX(18)}, ${centerY + waveHeight + 15})`}>
          <path
            d="M-5,-7 A7,7 0 1,1 -5,7 A5,5 0 1,0 -5,-7"
            fill="#FBBF24"
          />
        </g>

        {/* Sunrise icon at 6am (right) */}
        <g transform={`translate(${width - padding + 5}, ${centerY})`}>
          <circle cx="0" cy="0" r="6" fill="#F97316" />
          <line x1="-10" y1="8" x2="10" y2="8" stroke="#F97316" strokeWidth="2" />
        </g>

        {/* Time labels */}
        {timeLabels.map((item, index) => {
          const hourIndex = item.isEnd ? 24 : orderedHours.indexOf(item.hour);
          const x = item.isEnd ? width - padding : getX(hourIndex >= 0 ? hourIndex : 0);
          return (
            <text
              key={`label-${index}`}
              x={x}
              y={height + 25}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize="14"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// Activity Modal Component
const ActivityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  hourlyData: number[];
}> = ({ isOpen, onClose, userName, hourlyData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Work Activity Periods</h3>
            <p className="text-sm text-gray-400">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chart */}
        <div className="p-6">
          <ActivityWaveChart hourlyData={hourlyData} userName={userName} />
        </div>

        {/* Legend */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>Active hours (size = intensity)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Day time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span>Night time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TimeAttendanceTab: React.FC<TimeAttendanceTabProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<TimeAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'hours' | 'user'>('user');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [activityModal, setActivityModal] = useState<{ isOpen: boolean; userName: string; hourlyData: number[] }>({
    isOpen: false,
    userName: '',
    hourlyData: [],
  });

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleDayExpansion = (dayKey: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getTimeAttendance(startDate, endDate);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching time attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group data by user
  const groupedByUser = useMemo<UserGroupedData[]>(() => {
    if (!data) return [];

    const userMap = new Map<string, UserGroupedData>();

    data.dailyData.forEach((day) => {
      if (!userMap.has(day.userId)) {
        userMap.set(day.userId, {
          userId: day.userId,
          userName: day.userName,
          userAvatar: day.userAvatar,
          totalHoursWorked: 0,
          totalExtraHours: 0,
          totalTarget: 0,
          totalDiff: 0,
          daysWorked: 0,
          daysUnder: 0,
          daysOver: 0,
          days: [],
        });
      }

      const userGroup = userMap.get(day.userId)!;
      userGroup.totalHoursWorked += day.hoursWorked;
      userGroup.totalExtraHours += day.extraHours;
      userGroup.totalTarget += day.target;
      userGroup.totalDiff += day.diff;
      if (day.hoursWorked > 0) userGroup.daysWorked++;
      if (day.status === 'under') userGroup.daysUnder++;
      if (day.status === 'over') userGroup.daysOver++;
      userGroup.days.push(day);
    });

    // Sort days within each user by date descending
    userMap.forEach((user) => {
      user.days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(userMap.values());
  }, [data]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let users = selectedUser === 'all'
      ? groupedByUser
      : groupedByUser.filter((u) => u.userId === selectedUser);

    users = [...users].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'hours') {
        comparison = a.totalHoursWorked - b.totalHoursWorked;
      } else if (sortBy === 'user') {
        comparison = a.userName.localeCompare(b.userName);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return users;
  }, [groupedByUser, selectedUser, sortBy, sortOrder]);

  const handleSort = (column: 'hours' | 'user') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LogoLoader size="md" text="Loading attendance data" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  // Get unique users for filter
  const uniqueUsers = Array.from(
    new Map(data.dailyData.map((d) => [d.userId, { id: d.userId, name: d.userName }])).values()
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours Worked</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatHours(data.summary.totalHours)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Daily Hours</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatHours(data.summary.avgDailyHours)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Extra Hours</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatHours(data.summary.totalExtraHours)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Users Under Target</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {data.summary.usersUnderTarget} <span className="text-sm font-normal text-gray-500">/ {data.summary.totalUsers}</span>
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {data.alertUsers.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Attendance Alerts - Users Consistently Under Target
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.alertUsers.map((user) => (
              <div key={user.userId} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg">
                {user.userAvatar ? (
                  <img src={user.userAvatar} alt={user.userName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium">
                    {user.userName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.userName}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{user.underDays} days under target</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 dark:text-gray-400">Filter by User:</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="all">All Users</option>
          {uniqueUsers.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </div>

      {/* User-Grouped Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('user')}
                >
                  Employee {sortBy === 'user' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Days
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('hours')}
                >
                  Total Hours {sortBy === 'hours' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Diff
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Extra Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => {
                const isUserExpanded = expandedUsers.has(user.userId);
                const hasDays = user.days.length > 0;
                const hourlyData = isUserExpanded ? calculate24HourDistribution(user.days) : [];
                const hasTimeData = hourlyData.some(h => h > 0);

                return (
                  <React.Fragment key={user.userId}>
                    {/* User Row */}
                    <tr
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${hasDays ? 'cursor-pointer' : ''}`}
                      onClick={() => hasDays && toggleUserExpansion(user.userId)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasDays && (
                            <span className="text-gray-400 dark:text-gray-500 transition-transform duration-200" style={{ transform: isUserExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                          {!hasDays && <span className="w-4" />}
                          {user.userAvatar ? (
                            <img src={user.userAvatar} alt={user.userName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                              {user.userName.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {user.daysWorked} day{user.daysWorked !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatHours(user.totalHoursWorked)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatHours(user.totalTarget)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                        user.totalDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {user.totalDiff >= 0 ? '+' : ''}{formatHours(Math.abs(user.totalDiff))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {user.totalExtraHours > 0 ? formatHours(user.totalExtraHours) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.daysUnder > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                            ↓ {user.daysUnder} Under
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            ✓ On Track
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Activity Chart Button */}
                    {isUserExpanded && hasTimeData && (
                      <tr className="bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="ml-6">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivityModal({
                                  isOpen: true,
                                  userName: user.userName,
                                  hourlyData: hourlyData,
                                });
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              View Work Activity Chart
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expanded Days */}
                    {isUserExpanded && hasDays && user.days.map((day, dayIndex) => {
                      const dayKey = `${user.userId}-${day.date}`;
                      const isDayExpanded = expandedDays.has(dayKey);
                      const hasTickets = day.tickets && day.tickets.length > 0;

                      return (
                        <React.Fragment key={dayKey}>
                          {/* Day Row */}
                          <tr
                            className={`bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${hasTickets ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              hasTickets && toggleDayExpansion(dayKey);
                            }}
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2 ml-8">
                                {hasTickets && (
                                  <span className="text-gray-400 dark:text-gray-500 transition-transform duration-200" style={{ transform: isDayExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </span>
                                )}
                                {!hasTickets && <span className="w-3" />}
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {hasTickets && (
                                <span className="text-xs">
                                  {day.tickets.length} ticket{day.tickets.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatHours(day.hoursWorked)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {day.target}h
                            </td>
                            <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${
                              day.diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {day.diff >= 0 ? '+' : ''}{formatHours(Math.abs(day.diff))}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                              {day.extraHours > 0 ? formatHours(day.extraHours) : '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                day.status === 'on_track'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : day.status === 'over'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                {day.status === 'on_track' ? '✓' : day.status === 'over' ? '↑' : '↓'}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Tickets */}
                          {isDayExpanded && hasTickets && (
                            <tr className="bg-gray-100 dark:bg-gray-900/50">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="ml-16 space-y-2">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Ticket Breakdown
                                  </div>
                                  <div className="grid gap-2">
                                    {day.tickets.map((ticket, ticketIndex) => (
                                      <div
                                        key={`${ticket.issueKey}-${ticketIndex}`}
                                        className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-mono">
                                            {formatTime(ticket.startTime)} - {formatTime(ticket.endTime)}
                                          </span>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                            {ticket.issueKey}
                                          </span>
                                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-md">
                                            {ticket.issueTitle}
                                          </span>
                                          {ticket.isExtra && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                              Extra
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {formatHours(ticket.hours)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Modal */}
      <ActivityModal
        isOpen={activityModal.isOpen}
        onClose={() => setActivityModal({ isOpen: false, userName: '', hourlyData: [] })}
        userName={activityModal.userName}
        hourlyData={activityModal.hourlyData}
      />
    </div>
  );
};
