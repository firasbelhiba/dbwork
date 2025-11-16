'use client';

import React, { useEffect, useState } from 'react';
import { Achievement, UserAchievement } from '@/types';
import { achievementsAPI } from '@/lib/api';
import { AchievementUnlockModal } from './AchievementUnlockModal';
import { useAuth } from '@/contexts/AuthContext';

export const AchievementNotifier: React.FC = () => {
  const { user } = useAuth();
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Poll for newly unlocked achievements
  useEffect(() => {
    if (!user) return;

    const checkNewAchievements = async () => {
      try {
        const response = await achievementsAPI.getNewlyUnlocked();
        const userAchievements: UserAchievement[] = response.data;

        // Extract achievements that are unlocked but not viewed
        const achievements = userAchievements
          .filter((ua) => ua.unlocked && !ua.viewed)
          .map((ua) => ua.achievementId as Achievement)
          .filter(Boolean);

        if (achievements.length > 0) {
          setNewAchievements(achievements);
          // Show first achievement
          if (!currentAchievement) {
            setCurrentAchievement(achievements[0]);
          }
        }
      } catch (error) {
        console.error('Error checking new achievements:', error);
      }
    };

    // Check immediately
    checkNewAchievements();

    // Poll every 10 seconds
    const interval = setInterval(checkNewAchievements, 10000);

    return () => clearInterval(interval);
  }, [user, currentAchievement]);

  const handleClose = () => {
    // Remove current achievement from queue
    const remaining = newAchievements.slice(1);
    setNewAchievements(remaining);

    // Show next achievement if any
    if (remaining.length > 0) {
      setTimeout(() => {
        setCurrentAchievement(remaining[0]);
      }, 500);
    } else {
      setCurrentAchievement(null);
    }
  };

  if (!currentAchievement) return null;

  return (
    <AchievementUnlockModal
      achievement={currentAchievement}
      onClose={handleClose}
    />
  );
};
