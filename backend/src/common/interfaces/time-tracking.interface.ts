export interface TimeTracking {
  estimatedHours?: number;
  loggedHours: number; // Total logged time in seconds (accumulated)
  timeLogs: TimeLog[]; // Manual time entries
  timeEntries: TimeEntry[]; // Automatic time tracking sessions
  activeTimeEntry?: ActiveTimeEntry; // Currently running timer
  totalTimeSpent: number; // Total time in seconds (auto + manual)
}

export interface TimeLog {
  userId: string;
  hours: number;
  description?: string;
  date: Date;
}

export interface TimeEntry {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // Duration in seconds
  source: 'automatic' | 'manual';
  description?: string;
  pausedDuration?: number; // Time spent paused (for inactivity)
  createdAt: Date;
}

export interface ActiveTimeEntry {
  id: string;
  userId: string;
  startTime: Date;
  lastActivityAt: Date; // For inactivity detection
  isPaused: boolean;
  pausedAt?: Date;
  accumulatedPausedTime: number; // Total paused time in seconds
}
