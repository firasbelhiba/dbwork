'use client';

import React, { useEffect, useState } from 'react';
import { User, Achievement, UserAchievement, UserRole } from '@/types';
import { usersAPI, achievementsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface UserWithStats extends User {
  achievementStats?: {
    totalPoints: number;
    unlockedCount: number;
    totalAchievements: number;
  };
}

export const DeveloperLeaderboard: React.FC = () => {
  const { user: currentUser } = useAuth();
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
        usersAPI.getAll(),
        achievementsAPI.getAll(),
      ]);

      const allUsers: User[] = usersRes.data;
      const allAchievements: Achievement[] = achievementsRes.data;
      setAchievements(allAchievements);

      // Filter out admins, only show developers
      const developers = allUsers.filter(u => u.role !== UserRole.ADMIN);

      // Fetch achievement stats for each developer
      const developersWithStats = await Promise.all(
        developers.map(async (user) => {
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

      setUsers(developersWithStats);
    } catch (error: any) {
      console.error('Error fetching leaderboard data:', error);
      toast.error('Failed to load leaderboard');
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
          <p className="text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Developer Leaderboard</h2>
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

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-dark-600 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-400">
          <thead className="bg-gray-50 dark:bg-dark-500">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Developer
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
              const isCurrentUser = user._id === currentUser?._id;

              return (
                <tr
                  key={user._id}
                  className={`transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-500'
                  }`}
                >
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
                      {isCurrentUser && (
                        <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          (You)
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
                        <div className={`text-sm font-medium ${isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          {user.fullName || `${user.firstName} ${user.lastName}`}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.role === UserRole.PROJECT_MANAGER ? 'Project Manager' : user.role === UserRole.DEVELOPER ? 'Developer' : user.role}
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
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isCurrentUser ? 'bg-blue-600' : 'bg-green-600'
                            }`}
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

      {sortedUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No developers found.</p>
        </div>
      )}
    </div>
  );
};
