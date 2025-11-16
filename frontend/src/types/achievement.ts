export enum AchievementCategory {
  TASK_COMPLETION = 'task_completion',
  BUG_FIXES = 'bug_fixes',
  COLLABORATION = 'collaboration',
  CODE_QUALITY = 'code_quality',
  COMMUNICATION = 'communication',
  LEADERSHIP = 'leadership',
  LEARNING = 'learning',
  SPECIAL = 'special',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface AchievementCriteria {
  type: string;
  count?: number;
  timeframe?: string;
  condition?: any;
}

export interface Achievement {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: AchievementRarity;
  criteria: AchievementCriteria;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface UserAchievement {
  _id: string;
  userId: string;
  achievementId: Achievement | string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: AchievementProgress;
  viewed: boolean;
  createdAt: string;
  updatedAt: string;
}
