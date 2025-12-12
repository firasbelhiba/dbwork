'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { reportsAPI } from '@/lib/api';
import { LogoLoader } from '@/components/common';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

interface HourlyData {
  hour: string;
  minutes: number;
  label: string;
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

// Calculate hourly distribution from tickets
const calculateHourlyDistribution = (days: DailyData[]): HourlyData[] => {
  // Initialize hours from 6AM to 11PM
  const hourlyMinutes: Record<number, number> = {};
  for (let h = 6; h <= 23; h++) {
    hourlyMinutes[h] = 0;
  }

  // Process all tickets
  days.forEach((day) => {
    day.tickets?.forEach((ticket) => {
      const start = new Date(ticket.startTime);
      const end = new Date(ticket.endTime);

      // For each minute of work, add to the appropriate hour bucket
      let current = new Date(start);
      while (current < end) {
        const hour = current.getHours();
        if (hour >= 6 && hour <= 23) {
          hourlyMinutes[hour] += 1;
        }
        current = new Date(current.getTime() + 60000); // Add 1 minute
      }
    });
  });

  // Convert to array format for chart
  return Object.entries(hourlyMinutes).map(([hour, minutes]) => ({
    hour: `${hour.padStart(2, '0')}:00`,
    minutes: Math.round(minutes),
    label: parseInt(hour) < 12 ? `${hour}AM` : parseInt(hour) === 12 ? '12PM' : `${parseInt(hour) - 12}PM`,
  }));
};

// Find peak hours
const findPeakHours = (hourlyData: HourlyData[]): { start: string; end: string; avgMinutes: number } | null => {
  if (hourlyData.every(h => h.minutes === 0)) return null;

  const maxMinutes = Math.max(...hourlyData.map(h => h.minutes));
  const threshold = maxMinutes * 0.7; // 70% of peak is considered "peak zone"

  const peakHours = hourlyData.filter(h => h.minutes >= threshold);
  if (peakHours.length === 0) return null;

  return {
    start: peakHours[0].label,
    end: peakHours[peakHours.length - 1].label,
    avgMinutes: Math.round(peakHours.reduce((sum, h) => sum + h.minutes, 0) / peakHours.length),
  };
};

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const minutes = payload[0].value;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return (
      <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} worked
        </p>
      </div>
    );
  }
  return null;
};

export const TimeAttendanceTab: React.FC<TimeAttendanceTabProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<TimeAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'hours' | 'user'>('user');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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
                const hourlyData = isUserExpanded ? calculateHourlyDistribution(user.days) : [];
                const peakHours = isUserExpanded ? findPeakHours(hourlyData) : null;
                const hasTimeData = hourlyData.some(h => h.minutes > 0);

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

                    {/* Time Distribution Chart */}
                    {isUserExpanded && hasTimeData && (
                      <tr className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="ml-6">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Work Time Distribution
                                </span>
                              </div>
                              {peakHours && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                    🔥 Peak Hours: {peakHours.start} - {peakHours.end}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="h-32 bg-white dark:bg-gray-800 rounded-lg p-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hourlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                  <defs>
                                    <linearGradient id={`colorGradient-${user.userId}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                      <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.6}/>
                                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0.2}/>
                                    </linearGradient>
                                    <linearGradient id={`strokeGradient-${user.userId}`} x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#3B82F6"/>
                                      <stop offset="50%" stopColor="#8B5CF6"/>
                                      <stop offset="100%" stopColor="#EC4899"/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} />
                                  <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#6B7280' }}
                                    axisLine={{ stroke: '#E5E7EB' }}
                                    tickLine={{ stroke: '#E5E7EB' }}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 10, fill: '#6B7280' }}
                                    axisLine={{ stroke: '#E5E7EB' }}
                                    tickLine={{ stroke: '#E5E7EB' }}
                                    tickFormatter={(value) => `${Math.round(value)}m`}
                                  />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Area
                                    type="monotone"
                                    dataKey="minutes"
                                    stroke={`url(#strokeGradient-${user.userId})`}
                                    strokeWidth={2}
                                    fill={`url(#colorGradient-${user.userId})`}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
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
    </div>
  );
};
