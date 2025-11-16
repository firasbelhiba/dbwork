'use client';

import React, { useEffect, useState } from 'react';
import { Achievement, UserAchievement, AchievementCategory, AchievementRarity, UserRole } from '@/types';
import { achievementsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminAchievementsOverview } from '@/components/achievements/AdminAchievementsOverview';
import { DeveloperLeaderboard } from '@/components/achievements/DeveloperLeaderboard';
import { toast } from 'react-hot-toast';

const rarityColors: Record<AchievementRarity, { bg: string; border: string; text: string }> = {
  [AchievementRarity.COMMON]: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
  },
  [AchievementRarity.UNCOMMON]: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-400 dark:border-green-600',
    text: 'text-green-700 dark:text-green-300',
  },
  [AchievementRarity.RARE]: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-700 dark:text-blue-300',
  },
  [AchievementRarity.EPIC]: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-700 dark:text-purple-300',
  },
  [AchievementRarity.LEGENDARY]: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
};

interface AchievementWithProgress extends Achievement {
  userAchievement?: UserAchievement;
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'my-achievements' | 'leaderboard'>('my-achievements');
  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const [allAchievementsRes, userAchievementsRes] = await Promise.all([
        achievementsAPI.getAll(),
        achievementsAPI.getMyAchievements(),
      ]);

      const allAchievements: Achievement[] = allAchievementsRes.data;
      const userAchievements: UserAchievement[] = userAchievementsRes.data;

      // Create a map of user achievements by achievement ID
      const userAchievementMap = new Map<string, UserAchievement>();
      userAchievements.forEach((ua) => {
        // Handle cases where achievementId might be null/undefined or not populated
        if (!ua.achievementId) {
          console.warn('UserAchievement missing achievementId:', ua);
          return;
        }
        const achievementId = typeof ua.achievementId === 'string'
          ? ua.achievementId
          : (ua.achievementId as Achievement)?._id;
        if (achievementId) {
          userAchievementMap.set(achievementId, ua);
        }
      });

      // Merge achievements with user progress
      const achievementsWithProgress: AchievementWithProgress[] = allAchievements.map((achievement) => ({
        ...achievement,
        userAchievement: userAchievementMap.get(achievement._id),
      }));

      setAchievements(achievementsWithProgress);

      // Calculate stats
      const unlocked = userAchievements.filter((ua) => ua.unlocked).length;
      const points = userAchievements
        .filter((ua) => ua.unlocked)
        .reduce((sum, ua) => {
          const achievement = typeof ua.achievementId === 'string'
            ? allAchievements.find((a) => a._id === ua.achievementId)
            : ua.achievementId as Achievement;
          return sum + (achievement?.points || 0);
        }, 0);

      setUnlockedCount(unlocked);
      setTotalPoints(points);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleDebugStats = async () => {
    try {
      const response = await achievementsAPI.debugGetMyStats();
      setDebugInfo(response.data);
      setShowDebug(true);
      toast.success('Debug info loaded');
    } catch (error) {
      console.error('Error fetching debug stats:', error);
      toast.error('Failed to load debug stats');
    }
  };

  const handleDebugCheck = async () => {
    try {
      const response = await achievementsAPI.debugCheckAchievements();
      toast.success('Achievement check triggered! Check console for results.');
      console.log('Achievement Check Result:', response.data);
      await fetchAchievements(); // Refresh achievements
    } catch (error) {
      console.error('Error checking achievements:', error);
      toast.error('Failed to check achievements');
    }
  };

  const handleResetAchievements = async () => {
    if (!confirm('Are you sure you want to reset all your achievements? This will delete all progress and cannot be undone!')) {
      return;
    }
    try {
      const response = await achievementsAPI.debugResetAchievements();
      toast.success('Achievements reset successfully!');
      console.log('Reset Result:', response.data);
      await fetchAchievements(); // Refresh achievements
    } catch (error) {
      console.error('Error resetting achievements:', error);
      toast.error('Failed to reset achievements');
    }
  };

  const filteredAchievements = achievements.filter((achievement) => {
    if (selectedCategory === 'all') return true;
    return achievement.category === selectedCategory;
  });

  const categories = [
    { value: 'all' as const, label: 'All' },
    { value: AchievementCategory.TASK_COMPLETION, label: 'Task Completion' },
    { value: AchievementCategory.BUG_FIXES, label: 'Bug Fixes' },
    { value: AchievementCategory.COLLABORATION, label: 'Collaboration' },
    { value: AchievementCategory.CODE_QUALITY, label: 'Code Quality' },
    { value: AchievementCategory.COMMUNICATION, label: 'Communication' },
    { value: AchievementCategory.LEADERSHIP, label: 'Leadership' },
    { value: AchievementCategory.LEARNING, label: 'Learning' },
    { value: AchievementCategory.SPECIAL, label: 'Special' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading achievements...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show admin overview for admins, personal achievements for developers
  if (user?.role === UserRole.ADMIN) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Achievements Overview</h1>
          <AdminAchievementsOverview />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Achievements</h1>

          {/* Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('my-achievements')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'my-achievements'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-500'
                }`}
              >
                My Achievements
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-500'
                }`}
              >
                Leaderboard
              </button>
            </div>

            {/* Debug Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDebugStats}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                title="View your stats and achievement progress"
              >
                Debug Stats
              </button>
              <button
                onClick={handleDebugCheck}
                className="px-4 py-2 bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-300 dark:hover:bg-green-900/50 text-sm"
                title="Manually trigger achievement check"
              >
                Check Now
              </button>
              <button
                onClick={handleResetAchievements}
                className="px-4 py-2 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-300 dark:hover:bg-red-900/50 text-sm"
                title="Reset all achievements and stats (cannot be undone)"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Stats Cards - Only show in My Achievements tab */}
          {activeTab === 'my-achievements' && (
            <>
              {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-600 rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unlocked</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {unlockedCount} / {achievements.length}
                  </p>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPoints}</p>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completion</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-500'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
            </>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'my-achievements' ? (
          <>
            {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => {
            const ua = achievement.userAchievement;
            const isUnlocked = ua?.unlocked || false;
            const progress = ua?.progress;
            const colors = rarityColors[achievement.rarity];

            return (
              <div
                key={achievement._id}
                className={`bg-white dark:bg-dark-600 rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
                  isUnlocked ? 'border-2 ' + colors.border : 'opacity-60 grayscale'
                }`}
              >
                <div className={`p-6 ${isUnlocked ? colors.bg : 'bg-gray-50 dark:bg-dark-500'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl">{achievement.icon}</div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
                      {achievement.rarity}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {achievement.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {!isUnlocked && progress && progress.target > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress.current} / {progress.target}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-dark-400 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((progress.current / progress.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Points */}
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {achievement.points} points
                    </span>
                  </div>

                  {/* Unlocked Badge */}
                  {isUnlocked && ua?.unlockedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-400">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Unlocked {new Date(ua.unlockedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No achievements found in this category.</p>
          </div>
        )}
          </>
        ) : (
          <DeveloperLeaderboard />
        )}

        {/* Debug Info Modal */}
        {showDebug && debugInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-600 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Debug Info</h2>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">User Info</h3>
                  <pre className="bg-gray-100 dark:bg-dark-500 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify({ userId: debugInfo.userId, email: debugInfo.email }, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Stats</h3>
                  <pre className="bg-gray-100 dark:bg-dark-500 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugInfo.stats, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Achievements Progress</h3>
                  <pre className="bg-gray-100 dark:bg-dark-500 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugInfo.achievements, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
