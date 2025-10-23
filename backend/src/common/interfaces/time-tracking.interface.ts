export interface TimeTracking {
  estimatedHours?: number;
  loggedHours: number;
  timeLogs: TimeLog[];
}

export interface TimeLog {
  userId: string;
  hours: number;
  description?: string;
  date: Date;
}
