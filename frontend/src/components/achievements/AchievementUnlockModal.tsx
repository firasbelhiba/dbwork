'use client';

import React, { useEffect, useState } from 'react';
import { Achievement, UserAchievement, AchievementRarity } from '@/types';
import { achievementsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface AchievementUnlockModalProps {
  achievement: Achievement;
  onClose: () => void;
}

const rarityColors: Record<AchievementRarity, { bg: string; border: string; text: string; glow: string }> = {
  [AchievementRarity.COMMON]: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
    glow: 'shadow-gray-500/50',
  },
  [AchievementRarity.UNCOMMON]: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-400 dark:border-green-600',
    text: 'text-green-700 dark:text-green-300',
    glow: 'shadow-green-500/50',
  },
  [AchievementRarity.RARE]: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-700 dark:text-blue-300',
    glow: 'shadow-blue-500/50',
  },
  [AchievementRarity.EPIC]: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-700 dark:text-purple-300',
    glow: 'shadow-purple-500/50',
  },
  [AchievementRarity.LEGENDARY]: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    text: 'text-yellow-700 dark:text-yellow-300',
    glow: 'shadow-yellow-500/50',
  },
};

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  achievement,
  onClose,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const colors = rarityColors[achievement.rarity];

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsAnimating(true), 50);

    // Disable body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = async () => {
    try {
      // Mark as viewed
      await achievementsAPI.markAsViewed(achievement._id);
      onClose();
    } catch (error: any) {
      console.error('Error marking achievement as viewed:', error);
      toast.error('Failed to mark achievement as viewed');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity duration-300"
        style={{ opacity: isAnimating ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-gradient-to-br from-white to-gray-50 dark:from-dark-600 dark:to-dark-700 rounded-2xl shadow-2xl ${colors.glow} w-full max-w-md mx-4 transform transition-all duration-500`}
        style={{
          transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
          opacity: isAnimating ? 1 : 0,
        }}
      >
        {/* Confetti/Sparkle effect background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
          <div className="absolute top-10 right-1/4 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.7s' }} />
        </div>

        {/* Content */}
        <div className="relative px-8 py-10 text-center">
          {/* Achievement Unlocked Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Achievement Unlocked!
            </h2>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${colors.bg} ${colors.border} ${colors.text} border-2`}>
              {achievement.rarity}
            </div>
          </div>

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`w-32 h-32 flex items-center justify-center rounded-full ${colors.bg} ${colors.border} border-4 shadow-xl transform transition-transform duration-700`}
              style={{
                transform: isAnimating ? 'rotate(360deg) scale(1)' : 'rotate(0deg) scale(0.5)',
              }}
            >
              <span className="text-6xl">{achievement.icon}</span>
            </div>
          </div>

          {/* Achievement Details */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {achievement.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {achievement.description}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                +{achievement.points} Points
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
};
