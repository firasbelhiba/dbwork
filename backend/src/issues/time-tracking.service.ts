import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issue, IssueDocument } from './schemas/issue.schema';
import { TimeEntry, ActiveTimeEntry } from '@common/interfaces';

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_DURATION_MS = 10 * 60 * 60 * 1000; // 10 hours
// FOR TESTING: Changed to 12:40 PM - change back to 17:30 after testing
const END_OF_WORK_HOUR = 12; // 12 PM (TEST MODE - normally 17)
const END_OF_WORK_MINUTE = 40; // 40 minutes (TEST MODE - normally 30)

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
    let totalDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    // If currently paused, add the current pause duration
    if (activeEntry.isPaused && activeEntry.pausedAt) {
      const currentPauseDuration = Math.floor((now.getTime() - new Date(activeEntry.pausedAt).getTime()) / 1000);
      totalDuration -= (activeEntry.accumulatedPausedTime + currentPauseDuration);
    } else {
      totalDuration -= activeEntry.accumulatedPausedTime;
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

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.activeTimeEntry.isPaused': true,
          'timeTracking.activeTimeEntry.pausedAt': new Date(),
        },
      },
      { new: true }
    ).exec();

    return updatedIssue;
  }

  /**
   * Resume a paused timer
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
    const pausedAt = new Date(activeEntry.pausedAt);
    const now = new Date();
    const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
    const newAccumulatedPausedTime = activeEntry.accumulatedPausedTime + pauseDuration;

    const updatedIssue = await this.issueModel.findByIdAndUpdate(
      issueId,
      {
        $set: {
          'timeTracking.activeTimeEntry.isPaused': false,
          'timeTracking.activeTimeEntry.pausedAt': null,
          'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccumulatedPausedTime,
          'timeTracking.activeTimeEntry.lastActivityAt': now,
        },
      },
      { new: true }
    ).exec();

    return updatedIssue;
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
   * Stop all active timers at end of work day (5:30 PM)
   * This is called by a scheduled task
   */
  async stopAllTimersEndOfDay(): Promise<{ stoppedCount: number; errors: string[] }> {
    const now = new Date();
    const errors: string[] = [];
    let stoppedCount = 0;

    console.log(`[TIME_TRACKING] Running end-of-day timer stop at ${now.toISOString()}`);

    // Find all issues with active timers (both running and paused)
    const issuesWithActiveTimers = await this.issueModel.find({
      'timeTracking.activeTimeEntry': { $ne: null },
    }).exec();

    console.log(`[TIME_TRACKING] Found ${issuesWithActiveTimers.length} issues with active timers`);

    for (const issue of issuesWithActiveTimers) {
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (!activeEntry) continue;

      try {
        // Calculate the end time as 5:30 PM today
        const endOfWorkDay = new Date(now);
        endOfWorkDay.setHours(END_OF_WORK_HOUR, END_OF_WORK_MINUTE, 0, 0);

        const startTime = new Date(activeEntry.startTime);

        // Calculate duration excluding paused time, capped at end of work day
        let effectiveEndTime = endOfWorkDay;
        let totalDuration = Math.floor((effectiveEndTime.getTime() - startTime.getTime()) / 1000);

        // If currently paused, account for pause time
        if (activeEntry.isPaused && activeEntry.pausedAt) {
          const pausedAt = new Date(activeEntry.pausedAt);
          // If paused before end of day, use the pause time to calculate
          if (pausedAt < effectiveEndTime) {
            const currentPauseDuration = Math.floor((effectiveEndTime.getTime() - pausedAt.getTime()) / 1000);
            totalDuration -= (activeEntry.accumulatedPausedTime + currentPauseDuration);
          } else {
            totalDuration -= activeEntry.accumulatedPausedTime;
          }
        } else {
          totalDuration -= activeEntry.accumulatedPausedTime;
        }

        // Ensure duration is not negative
        totalDuration = Math.max(0, totalDuration);

        // Create completed time entry
        const timeEntry: TimeEntry = {
          id: activeEntry.id,
          userId: activeEntry.userId,
          startTime: startTime,
          endTime: effectiveEndTime,
          duration: totalDuration,
          source: 'automatic',
          description: 'Auto-stopped: End of work day (5:30 PM)',
          pausedDuration: activeEntry.accumulatedPausedTime,
          createdAt: now,
        };

        // Update issue with new time entry and clear active entry
        const currentTimeEntries = issue.timeTracking?.timeEntries || [];
        const currentTotalTime = issue.timeTracking?.totalTimeSpent || 0;

        await this.issueModel.findByIdAndUpdate(
          issue._id,
          {
            $set: {
              'timeTracking.activeTimeEntry': null,
              'timeTracking.timeEntries': [...currentTimeEntries, timeEntry],
              'timeTracking.totalTimeSpent': currentTotalTime + totalDuration,
            },
          },
        ).exec();

        stoppedCount++;
        console.log(`[TIME_TRACKING] Stopped timer for issue ${issue.key} (user: ${activeEntry.userId}, duration: ${totalDuration}s)`);
      } catch (error) {
        const errorMsg = `Failed to stop timer for issue ${issue._id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`[TIME_TRACKING] ${errorMsg}`);
      }
    }

    console.log(`[TIME_TRACKING] End-of-day timer stop complete. Stopped: ${stoppedCount}, Errors: ${errors.length}`);

    return { stoppedCount, errors };
  }
}
