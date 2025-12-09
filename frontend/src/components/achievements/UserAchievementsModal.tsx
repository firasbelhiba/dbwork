'use client';

import React, { useEffect, useState } from 'react';
import { User, Achievement, UserAchievement, AchievementRarity } from '@/types';
import { achievementsAPI } from '@/lib/api';
import { Modal } from '@/components/common';

interface UserAchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  allAchievements: Achievement[];
}

const rarityColors: Record<AchievementRarity, { bg: string; text: string; border: string }> = {
  [AchievementRarity.COMMON]: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-600 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
  },
  [AchievementRarity.UNCOMMON]: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-300 dark:border-green-700',
  },
  [AchievementRarity.RARE]: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
  },
  [AchievementRarity.EPIC]: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-700',
  },
  [AchievementRarity.LEGENDARY]: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
};

export const UserAchievementsModal: React.FC<UserAchievementsModalProps> = ({
  isOpen,
  onClose,
  user,
  allAchievements,
}) => {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (isOpen && user._id) {
      fetchUserAchievements();
    }
  }, [isOpen, user._id]);

  const fetchUserAchievements = async () => {
    try {
      setLoading(true);
      const response = await achievementsAPI.getUserAchievements(user._id);
      setUserAchievements(response.data);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a map of achievement ID to user achievement
  const userAchievementMap = new Map<string, UserAchievement>();
  userAchievements.forEach((ua) => {
    const achievementId = typeof ua.achievementId === 'string' ? ua.achievementId : ua.achievementId._id;
    userAchievementMap.set(achievementId, ua);
  });

  // Combine all achievements with user's progress
  const combinedAchievements = allAchievements.map((achievement) => {
    const userAchievement = userAchievementMap.get(achievement._id);
    return {
      achievement,
      userAchievement,
      unlocked: userAchievement?.unlocked || false,
      unlockedAt: userAchievement?.unlockedAt,
      progress: userAchievement?.progress || { current: 0, target: achievement.criteria.count || 1 },
    };
  });

  // Filter achievements
  const filteredAchievements = combinedAchievements.filter((item) => {
    if (filter === 'unlocked') return item.unlocked;
    if (filter === 'locked') return !item.unlocked;
    return true;
  });

  // Sort: unlocked first, then by rarity
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1;
    }
    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    return rarityOrder.indexOf(a.achievement.rarity) - rarityOrder.indexOf(b.achievement.rarity);
  });

  const unlockedCount = combinedAchievements.filter((a) => a.unlocked).length;
  const totalPoints = combinedAchievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.achievement.points, 0);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header with user info */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-dark-400">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName || `${user.firstName} ${user.lastName}`}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {user.firstName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {user.fullName || `${user.firstName} ${user.lastName}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{unlockedCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalPoints}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Points</div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 py-3 border-b border-gray-200 dark:border-dark-400">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-dark-500 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-400'
            }`}
          >
            All ({allAchievements.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'unlocked'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-dark-500 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-400'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'locked'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 dark:bg-dark-500 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-400'
            }`}
          >
            Locked ({allAchievements.length - unlockedCount})
          </button>
        </div>

        {/* Achievements list */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedAchievements.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No achievements found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sortedAchievements.map(({ achievement, unlocked, unlockedAt, progress }) => {
                const colors = rarityColors[achievement.rarity];
                const progressPercent = Math.min(
                  100,
                  (progress.current / progress.target) * 100
                );

                return (
                  <div
                    key={achievement._id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      unlocked
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-gray-50 dark:bg-dark-500 border-gray-200 dark:border-dark-400 opacity-60'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                        unlocked ? colors.bg : 'bg-gray-200 dark:bg-dark-400'
                      }`}
                    >
                      {unlocked ? achievement.icon : '🔒'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-semibold truncate ${
                            unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {achievement.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors.bg} ${colors.text}`}
                        >
                          {achievement.rarity}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate ${
                          unlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {achievement.description}
                      </p>
                      {!unlocked && progress.target > 1 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-dark-400 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {progress.current}/{progress.target}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Points & Date */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span
                          className={`font-semibold ${
                            unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {achievement.points}
                        </span>
                      </div>
                      {unlocked && unlockedAt && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(unlockedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
