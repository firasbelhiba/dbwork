'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Achievement, UserAchievement } from '@/types';
import { achievementsAPI } from '@/lib/api';
import { AchievementUnlockModal } from './AchievementUnlockModal';
import { useAuth } from '@/contexts/AuthContext';

export const AchievementNotifier: React.FC = () => {
  const { user } = useAuth();
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const isShowingModalRef = useRef(false);

  // Track modal state in ref to avoid re-creating interval
  useEffect(() => {
    isShowingModalRef.current = currentAchievement !== null;
  }, [currentAchievement]);

  const checkNewAchievements = useCallback(async () => {
    // Don't poll while modal is showing
    if (isShowingModalRef.current) return;

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
        setCurrentAchievement(achievements[0]);
      }
    } catch (error) {
      console.error('Error checking new achievements:', error);
    }
  }, []);

  // Poll for newly unlocked achievements
  useEffect(() => {
    if (!user) return;

    // Check immediately on mount
    checkNewAchievements();

    // Poll every 30 seconds (achievements are rare events)
    const interval = setInterval(checkNewAchievements, 30000);

    return () => clearInterval(interval);
  }, [user, checkNewAchievements]);

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
