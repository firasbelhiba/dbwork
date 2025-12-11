import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issue, IssueDocument } from './schemas/issue.schema';
import { TimeEntry, ActiveTimeEntry } from '@common/interfaces';

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_DURATION_MS = 10 * 60 * 60 * 1000; // 10 hours

@Injectable()
export class TimeTrackingService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
  ) {}

  /**
   * Start time tracking for an issue
   */
  async startTimer(issueId: string, userId: string): Promise<IssueDocument> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const userIdStr = userId.toString();

    // Check if there's already an active timer for this user on this issue
    if (issue.timeTracking?.activeTimeEntry?.userId === userIdStr) {
      throw new BadRequestException('Timer is already running for this issue');
    }

    // If another user has an active timer, that's fine - each user can track their own time
    // But if THIS user has an active timer, stop it first
    if (issue.timeTracking?.activeTimeEntry && issue.timeTracking.activeTimeEntry.userId !== userIdStr) {
      // Another user is tracking - allow this user to start their own timer
    }

    const now = new Date();
    const activeTimeEntry: ActiveTimeEntry = {
      id: new Types.ObjectId().toString(),
      userId: userIdStr,
      startTime: now,
      lastActivityAt: now,
      isPaused: false,
      accumulatedPausedTime: 0,
    };

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.activeTimeEntry': activeTimeEntry,
        },
      },
      { new: true }
    ).exec();

    console.log(`[TIMER_START] User ${userIdStr} STARTED timer on issue ${issue.key} at ${now.toISOString()}`);

    return updatedIssue;
  }

  /**
   * Stop time tracking and save the time entry
   */
  async stopTimer(issueId: string, userId: string, description?: string): Promise<IssueDocument> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const userIdStr = userId.toString();
    const activeEntry = issue.timeTracking?.activeTimeEntry;
    if (!activeEntry) {
      throw new BadRequestException('No active timer found for this issue');
    }

    if (activeEntry.userId !== userIdStr) {
      throw new BadRequestException('You can only stop your own timer');
    }

    const now = new Date();
    const startTime = new Date(activeEntry.startTime);

    // Calculate duration excluding paused time
    const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const accumulatedPausedTime = Number(activeEntry.accumulatedPausedTime) || 0;

    let totalDuration = elapsedSeconds;

    // If currently paused, add the current pause duration
    if (activeEntry.isPaused && activeEntry.pausedAt) {
      const currentPauseDuration = Math.floor((now.getTime() - new Date(activeEntry.pausedAt).getTime()) / 1000);
      totalDuration -= (accumulatedPausedTime + currentPauseDuration);
    } else {
      totalDuration -= accumulatedPausedTime;
    }

    // Log for debugging if duration would be 0 or negative
    if (totalDuration <= 0 && elapsedSeconds > 60) {
      console.log(`[TIME_TRACKING] WARNING: Duration calculated as ${totalDuration}s for issue ${issue.key}`);
      console.log(`  Elapsed: ${elapsedSeconds}s, AccumulatedPaused: ${accumulatedPausedTime}s`);
      console.log(`  StartTime: ${startTime.toISOString()}, Now: ${now.toISOString()}`);
      // Use elapsed time if paused time is corrupted (shouldn't exceed elapsed)
      if (accumulatedPausedTime > elapsedSeconds) {
        console.log(`  Correcting: accumulatedPausedTime (${accumulatedPausedTime}) > elapsed (${elapsedSeconds}), using elapsed`);
        totalDuration = elapsedSeconds;
      }
    }

    // Ensure duration is not negative
    totalDuration = Math.max(0, totalDuration);

    // Create completed time entry
    const timeEntry: TimeEntry = {
      id: activeEntry.id,
      userId: activeEntry.userId,
      startTime: startTime,
      endTime: now,
      duration: totalDuration,
      source: 'automatic',
      description,
      pausedDuration: activeEntry.accumulatedPausedTime,
      createdAt: now,
    };

    // Update issue with new time entry and clear active entry
    const currentTimeEntries = issue.timeTracking?.timeEntries || [];
    const currentTotalTime = issue.timeTracking?.totalTimeSpent || 0;

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.activeTimeEntry': null,
          'timeTracking.timeEntries': [...currentTimeEntries, timeEntry],
          'timeTracking.totalTimeSpent': currentTotalTime + totalDuration,
        },
      },
      { new: true }
    ).exec();

    const durationFormatted = `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`;
    console.log(`[TIMER_STOP] User ${userIdStr} STOPPED timer on issue ${issue.key} at ${now.toISOString()} (duration: ${durationFormatted})`);

    return updatedIssue;
  }

  /**
   * Pause the timer
   */
  async pauseTimer(issueId: string, userId: string): Promise<IssueDocument> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const userIdStr = userId.toString();
    const activeEntry = issue.timeTracking?.activeTimeEntry;
    if (!activeEntry) {
      throw new BadRequestException('No active timer found');
    }

    if (activeEntry.userId !== userIdStr) {
      throw new BadRequestException('You can only pause your own timer');
    }

    if (activeEntry.isPaused) {
      throw new BadRequestException('Timer is already paused');
    }

    const now = new Date();
    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.activeTimeEntry.isPaused': true,
          'timeTracking.activeTimeEntry.pausedAt': now,
        },
      },
      { new: true }
    ).exec();

    console.log(`[TIMER_PAUSE] User ${userIdStr} PAUSED timer on issue ${issue.key} at ${now.toISOString()}`);

    return updatedIssue;
  }

  /**
   * Resume a paused timer
   * If the timer was auto-paused at end of day and the user has worked more than 7 hours,
   * this starts extra hours tracking. Otherwise, it resumes as a normal timer.
   */
  async resumeTimer(issueId: string, userId: string): Promise<IssueDocument> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const userIdStr = userId.toString();
    const activeEntry = issue.timeTracking?.activeTimeEntry;
    if (!activeEntry) {
      throw new BadRequestException('No active timer found');
    }

    if (activeEntry.userId !== userIdStr) {
      throw new BadRequestException('You can only resume your own timer');
    }

    if (!activeEntry.isPaused) {
      throw new BadRequestException('Timer is not paused');
    }

    // Calculate pause duration and add to accumulated
    const now = new Date();
    let pauseDuration = 0;

    // Only calculate pause duration if pausedAt exists (data consistency check)
    if (activeEntry.pausedAt) {
      const pausedAt = new Date(activeEntry.pausedAt);
      pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
      // Ensure non-negative (in case of clock issues or corrupted data)
      pauseDuration = Math.max(0, pauseDuration);
    } else {
      // pausedAt is missing but isPaused is true - data inconsistency
      // Log warning and continue with 0 pause duration
      console.warn(`[TIME_TRACKING] Warning: Timer for issue ${issueId} is marked as paused but has no pausedAt timestamp`);
    }
    const newAccumulatedPausedTime = activeEntry.accumulatedPausedTime + pauseDuration;

    // Check if this was an end-of-day auto-pause - if so, check if user qualifies for extra hours
    const wasAutoPausedEndOfDay = (activeEntry as any).autoPausedEndOfDay === true;

    const updateData: any = {
      'timeTracking.activeTimeEntry.isPaused': false,
      'timeTracking.activeTimeEntry.pausedAt': null,
      'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccumulatedPausedTime,
      'timeTracking.activeTimeEntry.lastActivityAt': now,
      'timeTracking.activeTimeEntry.autoPausedEndOfDay': false,
    };

    // If resuming after end-of-day auto-pause, check if user has worked 7+ hours today
    if (wasAutoPausedEndOfDay) {
      const dailyWorkSeconds = await this.calculateUserDailyWorkTime(userIdStr, now);
      const SEVEN_HOURS_IN_SECONDS = 7 * 60 * 60; // 25200 seconds

      console.log(`[TIME_TRACKING] User ${userIdStr} daily work time: ${dailyWorkSeconds}s (${(dailyWorkSeconds / 3600).toFixed(2)} hours), threshold: ${SEVEN_HOURS_IN_SECONDS}s`);

      if (dailyWorkSeconds >= SEVEN_HOURS_IN_SECONDS) {
        // User has worked 7+ hours, mark as extra hours
        updateData['timeTracking.activeTimeEntry.isExtraHours'] = true;
        updateData['timeTracking.activeTimeEntry.extraHoursStartedAt'] = now;
        console.log(`[TIME_TRACKING] Resuming timer for issue ${issueId} as EXTRA HOURS (user worked ${(dailyWorkSeconds / 3600).toFixed(2)} hours today)`);
      } else {
        // User hasn't worked 7 hours yet, resume as normal timer
        console.log(`[TIME_TRACKING] Resuming timer for issue ${issueId} as NORMAL (user worked only ${(dailyWorkSeconds / 3600).toFixed(2)} hours today, needs 7 hours for extra)`);
      }
    }

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      { $set: updateData },
      { new: true }
    ).exec();

    const isExtraHours = updateData['timeTracking.activeTimeEntry.isExtraHours'] === true;
    console.log(`[TIMER_RESUME] User ${userIdStr} RESUMED timer on issue ${issue.key} at ${now.toISOString()}${isExtraHours ? ' (EXTRA HOURS)' : ''}`);

    return updatedIssue;
  }

  /**
   * Calculate total work time for a user on a specific day
   * This includes completed time entries and current active timer duration
   */
  private async calculateUserDailyWorkTime(userId: string, date: Date): Promise<number> {
    // Get start and end of the day in Tunisia timezone
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all issues that this user has time entries for today
    const issuesWithUserTime = await this.issueModel.find({
      $or: [
        // Issues with completed time entries by this user today
        {
          'timeTracking.timeEntries': {
            $elemMatch: {
              userId: userId,
              startTime: { $gte: startOfDay, $lte: endOfDay },
            },
          },
        },
        // Issues with active timer by this user
        {
          'timeTracking.activeTimeEntry.userId': userId,
        },
      ],
    }).exec();

    let totalSeconds = 0;

    for (const issue of issuesWithUserTime) {
      // Sum up completed time entries for today
      const timeEntries = issue.timeTracking?.timeEntries || [];
      for (const entry of timeEntries) {
        if (entry.userId === userId) {
          const entryStart = new Date(entry.startTime);
          // Check if the entry started today
          if (entryStart >= startOfDay && entryStart <= endOfDay) {
            totalSeconds += entry.duration;
          }
        }
      }

      // Add current active timer duration if it belongs to this user
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (activeEntry && activeEntry.userId === userId) {
        const startTime = new Date(activeEntry.startTime);
        const now = date;

        // Calculate elapsed time for active timer
        let elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

        // Subtract paused time
        if (activeEntry.isPaused && activeEntry.pausedAt) {
          const pausedAt = new Date(activeEntry.pausedAt);
          const currentPauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
          elapsedSeconds -= (activeEntry.accumulatedPausedTime + currentPauseDuration);
        } else {
          elapsedSeconds -= activeEntry.accumulatedPausedTime;
        }

        totalSeconds += Math.max(0, elapsedSeconds);
      }
    }

    return totalSeconds;
  }

  /**
   * Update last activity timestamp (for inactivity detection)
   */
  async updateActivity(issueId: string, userId: string): Promise<void> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) return;

    const userIdStr = userId.toString();
    const activeEntry = issue.timeTracking?.activeTimeEntry;
    if (!activeEntry || activeEntry.userId !== userIdStr || activeEntry.isPaused) {
      return;
    }

    await this.issueModel.findByIdAndUpdate(issueId, {
      $set: {
        'timeTracking.activeTimeEntry.lastActivityAt': new Date(),
      },
    }).exec();
  }

  /**
   * Check and auto-pause inactive timers
   */
  async checkInactiveTimers(): Promise<void> {
    const now = new Date();
    const inactivityThreshold = new Date(now.getTime() - INACTIVITY_THRESHOLD_MS);

    // Find all issues with active timers that are inactive
    const inactiveIssues = await this.issueModel.find({
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': false,
      'timeTracking.activeTimeEntry.lastActivityAt': { $lt: inactivityThreshold },
    }).exec();

    for (const issue of inactiveIssues) {
      await this.issueModel.findByIdAndUpdate(issue._id, {
        $set: {
          'timeTracking.activeTimeEntry.isPaused': true,
          'timeTracking.activeTimeEntry.pausedAt': issue.timeTracking.activeTimeEntry.lastActivityAt,
        },
      }).exec();
    }
  }

  /**
   * Add manual time entry
   */
  async addManualTimeEntry(
    issueId: string,
    userId: string,
    durationSeconds: number,
    description?: string,
  ): Promise<IssueDocument> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const userIdStr = userId.toString();
    const now = new Date();
    const timeEntry: TimeEntry = {
      id: new Types.ObjectId().toString(),
      userId: userIdStr,
      startTime: now,
      endTime: now,
      duration: durationSeconds,
      source: 'manual',
      description,
      createdAt: now,
    };

    const currentTimeEntries = issue.timeTracking?.timeEntries || [];
    const currentTotalTime = issue.timeTracking?.totalTimeSpent || 0;

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.timeEntries': [...currentTimeEntries, timeEntry],
          'timeTracking.totalTimeSpent': currentTotalTime + durationSeconds,
        },
      },
      { new: true }
    ).exec();

    return updatedIssue;
  }

  /**
   * Delete a time entry (admin/owner only)
   */
  async deleteTimeEntry(
    issueId: string,
    entryId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<IssueDocument> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const timeEntries = issue.timeTracking?.timeEntries || [];
    const entryIndex = timeEntries.findIndex(e => e.id === entryId);

    if (entryIndex === -1) {
      throw new NotFoundException('Time entry not found');
    }

    const entry = timeEntries[entryIndex];

    // Only admin or entry owner can delete
    if (!isAdmin && entry.userId !== userId) {
      throw new BadRequestException('You can only delete your own time entries');
    }

    const newTimeEntries = timeEntries.filter(e => e.id !== entryId);
    const currentTotalTime = issue.timeTracking?.totalTimeSpent || 0;
    const newTotalTime = Math.max(0, currentTotalTime - entry.duration);

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.timeEntries': newTimeEntries,
          'timeTracking.totalTimeSpent': newTotalTime,
        },
      },
      { new: true }
    ).exec();

    return updatedIssue;
  }

  /**
   * Get aggregated time for an issue (including sub-issues)
   */
  async getAggregatedTime(issueId: string): Promise<{
    ownTime: number;
    subIssuesTime: number;
    totalTime: number;
  }> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const ownTime = issue.timeTracking?.totalTimeSpent || 0;

    // Find all sub-issues
    const subIssues = await this.issueModel.find({
      parentIssue: new Types.ObjectId(issueId),
    }).exec();

    let subIssuesTime = 0;
    for (const subIssue of subIssues) {
      // Recursively get time for nested sub-issues
      const subTime = await this.getAggregatedTime(subIssue._id.toString());
      subIssuesTime += subTime.totalTime;
    }

    return {
      ownTime,
      subIssuesTime,
      totalTime: ownTime + subIssuesTime,
    };
  }

  /**
   * Get time tracking stats for a project
   */
  async getProjectTimeStats(projectId: string): Promise<{
    totalTime: number;
    byUser: { userId: string; totalTime: number }[];
    byIssue: { issueId: string; key: string; title: string; totalTime: number }[];
  }> {
    const issues = await this.issueModel.find({
      projectId: new Types.ObjectId(projectId),
    }).exec();

    let totalTime = 0;
    const userTimeMap = new Map<string, number>();
    const issueStats: { issueId: string; key: string; title: string; totalTime: number }[] = [];

    for (const issue of issues) {
      const issueTime = issue.timeTracking?.totalTimeSpent || 0;
      totalTime += issueTime;

      if (issueTime > 0) {
        issueStats.push({
          issueId: issue._id.toString(),
          key: issue.key,
          title: issue.title,
          totalTime: issueTime,
        });
      }

      // Aggregate by user
      const timeEntries = issue.timeTracking?.timeEntries || [];
      for (const entry of timeEntries) {
        const current = userTimeMap.get(entry.userId) || 0;
        userTimeMap.set(entry.userId, current + entry.duration);
      }
    }

    const byUser = Array.from(userTimeMap.entries()).map(([userId, time]) => ({
      userId,
      totalTime: time,
    }));

    // Sort by time descending
    byUser.sort((a, b) => b.totalTime - a.totalTime);
    issueStats.sort((a, b) => b.totalTime - a.totalTime);

    return {
      totalTime,
      byUser,
      byIssue: issueStats,
    };
  }

  /**
   * Get current timer status for a user on an issue
   */
  async getTimerStatus(issueId: string, userId: string): Promise<{
    isRunning: boolean;
    isPaused: boolean;
    currentDuration: number;
    startTime?: Date;
  }> {
    const issue = await this.issueModel.findById(issueId).exec();
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const userIdStr = userId.toString();
    const activeEntry = issue.timeTracking?.activeTimeEntry;

    if (!activeEntry || activeEntry.userId !== userIdStr) {
      return {
        isRunning: false,
        isPaused: false,
        currentDuration: 0,
      };
    }

    const now = new Date();
    const startTime = new Date(activeEntry.startTime);
    let currentDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    if (activeEntry.isPaused && activeEntry.pausedAt) {
      const pausedAt = new Date(activeEntry.pausedAt);
      const currentPauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
      currentDuration -= (activeEntry.accumulatedPausedTime + currentPauseDuration);
    } else {
      currentDuration -= activeEntry.accumulatedPausedTime;
    }

    return {
      isRunning: !activeEntry.isPaused,
      isPaused: activeEntry.isPaused,
      currentDuration: Math.max(0, currentDuration),
      startTime,
    };
  }

  /**
   * Pause all active timers at end of work day (instead of stopping them)
   * This allows users to resume their timers if they want to work extra hours
   * @param hour - The hour to use for end of work day (0-23)
   * @param minute - The minute to use for end of work day (0-59)
   */
  async stopAllTimersEndOfDay(hour: number = 17, minute: number = 30): Promise<{
    stoppedCount: number;
    errors: string[];
    stoppedTimers: Array<{ issueId: string; issueKey: string; userId: string; projectId: string }>;
  }> {
    const now = new Date();
    const errors: string[] = [];
    let stoppedCount = 0;
    const stoppedTimers: Array<{ issueId: string; issueKey: string; userId: string; projectId: string }> = [];

    console.log(`[TIME_TRACKING] Running end-of-day timer pause at ${now.toISOString()} (configured for ${hour}:${minute.toString().padStart(2, '0')})`);

    // Find all issues with active timers that are NOT already paused
    const issuesWithActiveTimers = await this.issueModel.find({
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': { $ne: true },
    }).exec();

    console.log(`[TIME_TRACKING] Found ${issuesWithActiveTimers.length} running timers to pause`);

    for (const issue of issuesWithActiveTimers) {
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (!activeEntry || activeEntry.isPaused) continue;

      try {
        // Pause the timer instead of stopping it
        // This keeps the activeTimeEntry but sets isPaused to true
        // Mark as autoPausedEndOfDay so we know to track extra hours when resumed
        await this.issueModel.findByIdAndUpdate(
          issue._id,
          {
            $set: {
              'timeTracking.activeTimeEntry.isPaused': true,
              'timeTracking.activeTimeEntry.pausedAt': now,
              'timeTracking.activeTimeEntry.autoPausedEndOfDay': true,
            },
          },
        ).exec();

        stoppedCount++;
        stoppedTimers.push({
          issueId: issue._id.toString(),
          issueKey: issue.key,
          userId: activeEntry.userId.toString(),
          projectId: issue.projectId.toString(),
        });
        console.log(`[TIMER_AUTO_PAUSE] SYSTEM auto-paused timer for user ${activeEntry.userId} on issue ${issue.key} at ${now.toISOString()} (end-of-day)`);
      } catch (error) {
        const errorMsg = `Failed to pause timer for issue ${issue._id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[TIME_TRACKING] ${errorMsg}`);
      }
    }

    console.log(`[TIME_TRACKING] End-of-day timer pause complete. Paused: ${stoppedCount}, Errors: ${errors.length}`);

    return { stoppedCount, errors, stoppedTimers };
  }

  /**
   * Resume all paused timers at start of work day (9 AM)
   * This automatically restarts ALL paused timers for in_progress issues
   * regardless of how they were paused (end-of-day, manual, inactivity, etc.)
   */
  async resumeAllTimersStartOfDay(): Promise<{
    resumedCount: number;
    errors: string[];
    resumedTimers: Array<{ issueId: string; issueKey: string; userId: string; projectId: string }>;
  }> {
    const now = new Date();
    const errors: string[] = [];
    let resumedCount = 0;
    const resumedTimers: Array<{ issueId: string; issueKey: string; userId: string; projectId: string }> = [];

    console.log(`[TIME_TRACKING] Running start-of-day timer resume at ${now.toISOString()}`);

    // Find ALL in_progress issues with paused timers (regardless of how they were paused)
    // This ensures all timers resume at 9 AM, whether they were:
    // - Auto-paused at end of day (5:30 PM)
    // - Manually paused by the user
    // - Paused due to inactivity
    const issuesWithPausedTimers = await this.issueModel.find({
      status: 'in_progress',
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': true,
    }).exec();

    console.log(`[TIME_TRACKING] Found ${issuesWithPausedTimers.length} paused timers to resume`);

    for (const issue of issuesWithPausedTimers) {
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (!activeEntry) continue;

      try {
        // Calculate pause duration and add to accumulated
        const pausedAt = new Date(activeEntry.pausedAt);
        const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
        const newAccumulatedPausedTime = activeEntry.accumulatedPausedTime + pauseDuration;

        // Resume the timer - NOT as extra hours (fresh start of day)
        await this.issueModel.findByIdAndUpdate(
          issue._id,
          {
            $set: {
              'timeTracking.activeTimeEntry.isPaused': false,
              'timeTracking.activeTimeEntry.pausedAt': null,
              'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccumulatedPausedTime,
              'timeTracking.activeTimeEntry.lastActivityAt': now,
              'timeTracking.activeTimeEntry.autoPausedEndOfDay': false,
              'timeTracking.activeTimeEntry.isExtraHours': false,
            },
          },
        ).exec();

        resumedCount++;
        resumedTimers.push({
          issueId: issue._id.toString(),
          issueKey: issue.key,
          userId: activeEntry.userId.toString(),
          projectId: issue.projectId.toString(),
        });
        console.log(`[TIMER_AUTO_RESUME] SYSTEM auto-resumed timer for user ${activeEntry.userId} on issue ${issue.key} at ${now.toISOString()} (start-of-day)`);
      } catch (error) {
        const errorMsg = `Failed to resume timer for issue ${issue._id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[TIME_TRACKING] ${errorMsg}`);
      }
    }

    console.log(`[TIME_TRACKING] Start-of-day timer resume complete. Resumed: ${resumedCount}, Errors: ${errors.length}`);

    return { resumedCount, errors, resumedTimers };
  }

  /**
   * Start timers for all in_progress issues that don't have an active timer
   * This ensures all in_progress tickets have running counters at 9 AM
   * Handles cases where:
   * - Ticket was set to in_progress but timer was never started
   * - Timer was stopped completely (not paused) previously
   */
  async startTimersForInProgressIssuesWithoutTimer(): Promise<{
    startedCount: number;
    errors: string[];
    startedTimers: Array<{ issueId: string; issueKey: string; userId: string; projectId: string }>;
  }> {
    const now = new Date();
    const errors: string[] = [];
    let startedCount = 0;
    const startedTimers: Array<{ issueId: string; issueKey: string; userId: string; projectId: string }> = [];

    console.log(`[TIME_TRACKING] Starting timers for in_progress issues without active timer at ${now.toISOString()}`);

    // Find all in_progress issues that have NO active timer (null or missing)
    // These are issues that are in progress but have no counter running
    const issuesWithoutTimer = await this.issueModel.find({
      status: 'in_progress',
      isArchived: { $ne: true },
      $or: [
        { 'timeTracking.activeTimeEntry': null },
        { 'timeTracking.activeTimeEntry': { $exists: false } },
        { timeTracking: { $exists: false } },
      ],
    }).populate('assignees', '_id').exec();

    console.log(`[TIME_TRACKING] Found ${issuesWithoutTimer.length} in_progress issues without active timer`);

    for (const issue of issuesWithoutTimer) {
      try {
        // Get the first assignee to start the timer for
        // If no assignees, we can't start a timer (need a user)
        const assignees = issue.assignees as any[];
        if (!assignees || assignees.length === 0) {
          console.log(`[TIME_TRACKING] Issue ${issue.key} has no assignees, skipping timer start`);
          continue;
        }

        // Use the first assignee's ID
        const userId = assignees[0]._id ? assignees[0]._id.toString() : assignees[0].toString();

        // Create new active timer entry
        const activeTimeEntry: ActiveTimeEntry = {
          id: new Types.ObjectId().toString(),
          userId: userId,
          startTime: now,
          lastActivityAt: now,
          isPaused: false,
          accumulatedPausedTime: 0,
        };

        await this.issueModel.findByIdAndUpdate(
          issue._id,
          {
            $set: {
              'timeTracking.activeTimeEntry': activeTimeEntry,
            },
          },
        ).exec();

        startedCount++;
        startedTimers.push({
          issueId: issue._id.toString(),
          issueKey: issue.key,
          userId: userId,
          projectId: issue.projectId.toString(),
        });
        console.log(`[TIMER_AUTO_START] SYSTEM auto-started timer for user ${userId} on issue ${issue.key} at ${now.toISOString()} (start-of-day, no previous timer)`);
      } catch (error) {
        const errorMsg = `Failed to start timer for issue ${issue._id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[TIME_TRACKING] ${errorMsg}`);
      }
    }

    console.log(`[TIME_TRACKING] Start-of-day timer start complete. Started: ${startedCount}, Errors: ${errors.length}`);

    return { startedCount, errors, startedTimers };
  }
}
