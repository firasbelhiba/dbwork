import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TimeTrackingService } from './time-tracking.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class TimeTrackingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TimeTrackingSchedulerService.name);

  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly webSocketGateway: AppWebSocketGateway,
    private readonly adminService: AdminService,
  ) {}

  async onModuleInit() {
    this.logger.log('TimeTrackingSchedulerService initialized - cron jobs are registered');
    // Log initial settings on startup
    try {
      const settings = await this.adminService.getTimerSettings();
      this.logger.log(`Timer auto-stop configured for ${settings.timerAutoStopHour.toString().padStart(2, '0')}:${settings.timerAutoStopMinute.toString().padStart(2, '0')} ${settings.timerAutoStopTimezone} (enabled: ${settings.timerAutoStopEnabled})`);
    } catch (error) {
      this.logger.warn('Could not load timer settings on startup:', error.message);
    }
  }

  /**
   * Get current time in a specific timezone
   */
  private getTimeInTimezone(timezone: string): { hour: number; minute: number; dayOfWeek: number } {
    const now = new Date();

    // Use Intl.DateTimeFormat to reliably get time in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '';

    // Convert weekday string to number (0 = Sunday, 6 = Saturday)
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = weekdayMap[weekdayStr] ?? new Date().getDay();

    return { hour, minute, dayOfWeek };
  }

  /**
   * Check every minute if it's time to stop timers based on admin settings
   * This allows dynamic configuration of the auto-stop time
   * Runs every minute on the server, but checks against Tunisia timezone
   */
  @Cron('0 * * * * *', {
    name: 'timer-auto-stop-check',
  })
  async handleTimerAutoStopCheck() {
    try {
      const settings = await this.adminService.getTimerSettings();

      // Skip if auto-stop is disabled
      if (!settings.timerAutoStopEnabled) {
        return;
      }

      // Get current time in configured timezone (defaults to Tunisia)
      const timezone = settings.timerAutoStopTimezone || 'Africa/Tunis';
      const { hour: currentHour, minute: currentMinute, dayOfWeek } = this.getTimeInTimezone(timezone);

      // Check if it's a weekday (if weekdays only is enabled)
      if (settings.timerAutoStopWeekdaysOnly && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return;
      }

      // Log every minute for debugging (use .log instead of .debug to ensure visibility)
      this.logger.log(`Timer check - ${timezone} time: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}, Target: ${settings.timerAutoStopHour.toString().padStart(2, '0')}:${settings.timerAutoStopMinute.toString().padStart(2, '0')}`);

      if (currentHour === settings.timerAutoStopHour && currentMinute === settings.timerAutoStopMinute) {
        this.logger.log(`Running scheduled end-of-day timer pause (${settings.timerAutoStopHour}:${settings.timerAutoStopMinute.toString().padStart(2, '0')})`);

        const result = await this.timeTrackingService.stopAllTimersEndOfDay(
          settings.timerAutoStopHour,
          settings.timerAutoStopMinute,
        );

        if (result.stoppedCount > 0) {
          this.logger.log(`Successfully paused ${result.stoppedCount} timer(s)`);

          // Emit WebSocket events for each stopped timer
          for (const stoppedTimer of result.stoppedTimers) {
            this.webSocketGateway.emitTimerAutoStopped(
              stoppedTimer.userId,
              stoppedTimer.projectId,
              stoppedTimer.issueId,
              stoppedTimer.issueKey,
            );
          }
        } else {
          this.logger.log('No running timers to pause');
        }

        if (result.errors.length > 0) {
          this.logger.warn(`Encountered ${result.errors.length} error(s) while pausing timers`);
          result.errors.forEach((err) => this.logger.error(err));
        }
      }
    } catch (error) {
      this.logger.error('Failed to check timer auto-stop', error.stack);
    }
  }

  /**
   * Also check for inactive timers every 15 minutes during work hours
   * This auto-pauses timers that have been inactive for 30+ minutes
   */
  @Cron('0 */15 8-18 * * 1-5', {
    name: 'inactive-timer-check',
    timeZone: 'Africa/Tunis',
  })
  async handleInactiveTimerCheck() {
    this.logger.debug('Checking for inactive timers...');

    try {
      await this.timeTrackingService.checkInactiveTimers();
    } catch (error) {
      this.logger.error('Failed to check inactive timers', error.stack);
    }
  }

  /**
   * Stop all extra hours timers at 9 AM (start of work day)
   * This is the maximum time extra hours can run
   * Runs at 9:00 AM Tunisia time on weekdays
   */
  @Cron('0 0 9 * * 1-5', {
    name: 'extra-hours-stop',
    timeZone: 'Africa/Tunis',
  })
  async handleExtraHoursStop() {
    this.logger.log('Checking for extra hours timers to stop at start of work day (9 AM)...');

    try {
      const result = await this.timeTrackingService.stopExtraHoursTimers();

      if (result.stoppedCount > 0) {
        this.logger.log(`Successfully stopped ${result.stoppedCount} extra hours timer(s)`);

        // Emit WebSocket events for each stopped timer
        for (const stoppedTimer of result.stoppedTimers) {
          this.webSocketGateway.emitTimerAutoStopped(
            stoppedTimer.userId,
            stoppedTimer.projectId,
            stoppedTimer.issueId,
            stoppedTimer.issueKey,
          );
        }
      } else {
        this.logger.log('No extra hours timers to stop');
      }

      if (result.errors.length > 0) {
        this.logger.warn(`Encountered ${result.errors.length} error(s) while stopping extra hours timers`);
        result.errors.forEach((err) => this.logger.error(err));
      }
    } catch (error) {
      this.logger.error('Failed to stop extra hours timers', error.stack);
    }
  }
}
