'use client';

import React, { useEffect, useState } from 'react';
import { User, Achievement, UserAchievement } from '@/types';
import { usersAPI, achievementsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface UserWithStats extends User {
  achievementStats?: {
    totalPoints: number;
    unlockedCount: number;
    totalAchievements: number;
  };
}

export const AdminAchievementsOverview: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'points' | 'achievements'>('points');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, achievementsRes] = await Promise.all([
        usersAPI.getAll({ limit: 100 }),
        achievementsAPI.getAll(),
      ]);

      // Handle paginated response - items contains the user array
      const allUsers: User[] = usersRes.data.items || usersRes.data;
      const allAchievements: Achievement[] = achievementsRes.data;
      setAchievements(allAchievements);

      // Fetch achievement stats for each user
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          try {
            const userAchievementsRes = await achievementsAPI.getUserAchievements(user._id);
            const userAchievements: UserAchievement[] = userAchievementsRes.data;

            const unlockedCount = userAchievements.filter((ua) => ua.unlocked).length;
            const totalPoints = userAchievements
              .filter((ua) => ua.unlocked)
              .reduce((sum, ua) => {
                const achievement = typeof ua.achievementId === 'string'
                  ? allAchievements.find((a) => a._id === ua.achievementId)
                  : ua.achievementId as Achievement;
                return sum + (achievement?.points || 0);
              }, 0);

            return {
              ...user,
              achievementStats: {
                totalPoints,
                unlockedCount,
                totalAchievements: allAchievements.length,
              },
            };
          } catch (error) {
            console.error(`Error fetching achievements for user ${user._id}:`, error);
            return {
              ...user,
              achievementStats: {
                totalPoints: 0,
                unlockedCount: 0,
                totalAchievements: allAchievements.length,
              },
            };
          }
        })
      );

      setUsers(usersWithStats);
    } catch (error: any) {
      console.error('Error fetching admin achievements data:', error);
      toast.error('Failed to load achievements data');
    } finally {
      setLoading(false);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'points') {
      return (b.achievementStats?.totalPoints || 0) - (a.achievementStats?.totalPoints || 0);
    } else {
      return (b.achievementStats?.unlockedCount || 0) - (a.achievementStats?.unlockedCount || 0);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading achievements overview...</p>
        </div>
      </div>
    );
  }

  const totalAchievements = achievements.length;
  const avgPointsPerUser = users.length > 0
    ? users.reduce((sum, u) => sum + (u.achievementStats?.totalPoints || 0), 0) / users.length
    : 0;
  const avgUnlockedPerUser = users.length > 0
    ? users.reduce((sum, u) => sum + (u.achievementStats?.unlockedCount || 0), 0) / users.length
    : 0;

  return (
    <div>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-600 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Achievements</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAchievements}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-600 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Points/User</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(avgPointsPerUser)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-600 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Unlocked/User</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgUnlockedPerUser.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Leaderboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('points')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortBy === 'points'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-500'
            }`}
          >
            Sort by Points
          </button>
          <button
            onClick={() => setSortBy('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortBy === 'achievements'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-500'
            }`}
          >
            Sort by Achievements
          </button>
        </div>
      </div>

      {/* User Leaderboard Table */}
      <div className="bg-white dark:bg-dark-600 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-400">
          <thead className="bg-gray-50 dark:bg-dark-500">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Achievements
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Completion
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-600 divide-y divide-gray-200 dark:divide-dark-400">
            {sortedUsers.map((user, index) => {
              const stats = user.achievementStats!;
              const completionRate = (stats.unlockedCount / stats.totalAchievements) * 100;

              return (
                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index < 3 ? (
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.fullName || `${user.firstName} ${user.lastName}`}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {user.firstName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.fullName || `${user.firstName} ${user.lastName}`}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                      {stats.unlockedCount} / {stats.totalAchievements}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stats.totalPoints}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 dark:bg-dark-400 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {completionRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
