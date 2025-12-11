'use client';

import React, { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/api';
import { LogoLoader } from '@/components/common';

interface TicketBreakdown {
  issueKey: string;
  issueTitle: string;
  projectKey: string;
  seconds: number;
  hours: number;
  isExtra: boolean;
}

interface TimeAttendanceData {
  dailyData: Array<{
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
  }>;
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

export const TimeAttendanceTab: React.FC<TimeAttendanceTabProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<TimeAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'hours' | 'user'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (rowKey: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
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

  // Filter and sort data
  let filteredData = selectedUser === 'all'
    ? data.dailyData
    : data.dailyData.filter((d) => d.userId === selectedUser);

  filteredData = [...filteredData].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'hours') {
      comparison = a.hoursWorked - b.hoursWorked;
    } else if (sortBy === 'user') {
      comparison = a.userName.localeCompare(b.userName);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: 'date' | 'hours' | 'user') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

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
            Attendance Alerts - Users Consistently Under 8 Hours
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

      {/* Daily Hours Table */}
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
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('date')}
                >
                  Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('hours')}
                >
                  Hours Worked {sortBy === 'hours' && (sortOrder === 'asc' ? '↑' : '↓')}
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
              {filteredData.slice(0, 100).map((row, index) => {
                const rowKey = `${row.userId}-${row.date}-${index}`;
                const isExpanded = expandedRows.has(rowKey);
                const hasTickets = row.tickets && row.tickets.length > 0;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${hasTickets ? 'cursor-pointer' : ''}`}
                      onClick={() => hasTickets && toggleRowExpansion(rowKey)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasTickets && (
                            <span className="text-gray-400 dark:text-gray-500 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                          {!hasTickets && <span className="w-4" />}
                          {row.userAvatar ? (
                            <img src={row.userAvatar} alt={row.userName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                              {row.userName.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatHours(row.hoursWorked)}
                        {hasTickets && (
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                            ({row.tickets.length} ticket{row.tickets.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {row.target}h
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                        row.diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {row.diff >= 0 ? '+' : ''}{formatHours(Math.abs(row.diff))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {row.extraHours > 0 ? formatHours(row.extraHours) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.status === 'on_track'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : row.status === 'over'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {row.status === 'on_track' ? '✓ On Track' : row.status === 'over' ? '↑ Over' : '↓ Under'}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded ticket breakdown */}
                    {isExpanded && hasTickets && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="ml-10 space-y-2">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                              Ticket Breakdown
                            </div>
                            <div className="grid gap-2">
                              {row.tickets.map((ticket, ticketIndex) => (
                                <div
                                  key={`${ticket.issueKey}-${ticketIndex}`}
                                  className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600"
                                >
                                  <div className="flex items-center gap-3">
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
            </tbody>
          </table>
        </div>
        {filteredData.length > 100 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-500 dark:text-gray-400 text-center">
            Showing 100 of {filteredData.length} records
          </div>
        )}
      </div>
    </div>
  );
};
