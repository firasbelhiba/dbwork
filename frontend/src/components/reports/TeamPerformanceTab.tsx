'use client';

import React, { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/api';
import { LogoLoader, Modal } from '@/components/common';

interface TeamProductivityData {
  users: Array<{
    odataKey: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar: string | null;
    issuesCompleted: number;
    avgCompletionTime: number;
    avgCompletionDays: number;
    totalTimeLogged: number;
    extraHours: number;
    projectsWorkedOn: number;
  }>;
  leaderboard: {
    mostProductive: { userId: string; userName: string; userAvatar: string | null; value: number; label: string } | null;
    mostTimeLogged: { userId: string; userName: string; userAvatar: string | null; value: number; label: string } | null;
    fastestCompletion: { userId: string; userName: string; userAvatar: string | null; value: number; label: string } | null;
  };
  summary: {
    totalIssuesCompleted: number;
    totalTimeLogged: number;
    totalExtraHours: number;
    activeUsers: number;
  };
}

interface UserDetailData {
  user: { userId: string; userName: string; userEmail: string; userAvatar: string | null };
  timeByProject: Array<{ projectId: string; projectName: string; hours: number }>;
  dailyActivity: Array<{ date: string; hours: number }>;
  issuesWorkedOn: Array<{ issueId: string; issueKey: string; title: string; status: string; timeSpent: number }>;
  summary: { totalHours: number; projectsWorkedOn: number; issuesWorkedOn: number };
}

interface TeamPerformanceTabProps {
  startDate: string;
  endDate: string;
}

const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const TeamPerformanceTab: React.FC<TeamPerformanceTabProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<TeamProductivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getTeamProductivity(startDate, endDate);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching team productivity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    try {
      const response = await reportsAPI.getUserDetail(userId, startDate, endDate);
      setUserDetail(response.data);
    } catch (error) {
      console.error('Error fetching user detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedUserId(null);
    setUserDetail(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LogoLoader size="md" text="Loading team performance" />
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Issues Completed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalIssuesCompleted}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Time Logged</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatHours(data.summary.totalTimeLogged)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Extra Hours</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatHours(data.summary.totalExtraHours)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.activeUsers}</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.leaderboard.mostProductive && (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏆</span>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Most Productive</p>
            </div>
            <div className="flex items-center gap-3">
              {data.leaderboard.mostProductive.userAvatar ? (
                <img src={data.leaderboard.mostProductive.userAvatar} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-yellow-300 dark:bg-yellow-700 flex items-center justify-center text-lg font-bold text-yellow-800 dark:text-yellow-200">
                  {data.leaderboard.mostProductive.userName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{data.leaderboard.mostProductive.userName}</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {data.leaderboard.mostProductive.value} {data.leaderboard.mostProductive.label}
                </p>
              </div>
            </div>
          </div>
        )}

        {data.leaderboard.mostTimeLogged && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⏱️</span>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Most Time Logged</p>
            </div>
            <div className="flex items-center gap-3">
              {data.leaderboard.mostTimeLogged.userAvatar ? (
                <img src={data.leaderboard.mostTimeLogged.userAvatar} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-300 dark:bg-blue-700 flex items-center justify-center text-lg font-bold text-blue-800 dark:text-blue-200">
                  {data.leaderboard.mostTimeLogged.userName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{data.leaderboard.mostTimeLogged.userName}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {formatHours(data.leaderboard.mostTimeLogged.value)}
                </p>
              </div>
            </div>
          </div>
        )}

        {data.leaderboard.fastestCompletion && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Fastest Completion</p>
            </div>
            <div className="flex items-center gap-3">
              {data.leaderboard.fastestCompletion.userAvatar ? (
                <img src={data.leaderboard.fastestCompletion.userAvatar} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-300 dark:bg-green-700 flex items-center justify-center text-lg font-bold text-green-800 dark:text-green-200">
                  {data.leaderboard.fastestCompletion.userName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{data.leaderboard.fastestCompletion.userName}</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {data.leaderboard.fastestCompletion.value} {data.leaderboard.fastestCompletion.label}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Individual Performance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Click on a user to see detailed breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Issues Completed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Completion
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time Logged
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Extra Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Projects
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.users.map((user) => (
                <tr
                  key={user.userId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => handleUserClick(user.userId)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.userAvatar ? (
                        <img src={user.userAvatar} alt={user.userName} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                          {user.userName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.issuesCompleted}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {user.avgCompletionDays > 0 ? `${user.avgCompletionDays} days` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatHours(user.totalTimeLogged)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {user.extraHours > 0 ? formatHours(user.extraHours) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {user.projectsWorkedOn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <Modal isOpen={true} onClose={closeModal} title={userDetail?.user.userName || 'User Details'} size="lg">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <LogoLoader size="sm" text="Loading details" />
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatHours(userDetail.summary.totalHours)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Hours</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userDetail.summary.projectsWorkedOn}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Projects</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userDetail.summary.issuesWorkedOn}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Issues</p>
                </div>
              </div>

              {/* Time by Project */}
              {userDetail.timeByProject.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Time by Project</h4>
                  <div className="space-y-2">
                    {userDetail.timeByProject.map((project) => (
                      <div key={project.projectId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{project.projectName}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatHours(project.hours)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues Worked On */}
              {userDetail.issuesWorkedOn.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Issues Worked On</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {userDetail.issuesWorkedOn.slice(0, 10).map((issue) => (
                      <div key={issue.issueId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{issue.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{issue.issueKey}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">{formatHours(issue.timeSpent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Failed to load user details</div>
          )}
        </Modal>
      )}
    </div>
  );
};
