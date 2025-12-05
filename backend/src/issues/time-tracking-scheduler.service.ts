import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TimeTrackingService } from './time-tracking.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class TimeTrackingSchedulerService {
  private readonly logger = new Logger(TimeTrackingSchedulerService.name);

  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly webSocketGateway: AppWebSocketGateway,
    private readonly adminService: AdminService,
  ) {}

  /**
   * Check every minute if it's time to stop timers based on admin settings
   * This allows dynamic configuration of the auto-stop time
   */
  @Cron('0 * * * * *', {
    name: 'timer-auto-stop-check',
    timeZone: 'Africa/Tunis',
  })
  async handleTimerAutoStopCheck() {
    try {
      const settings = await this.adminService.getTimerSettings();

      // Skip if auto-stop is disabled
      if (!settings.timerAutoStopEnabled) {
        return;
      }

      // Get current time in Tunisia timezone
      const now = new Date();
      const tunisiaTime = new Date(now.toLocaleString('en-US', { timeZone: settings.timerAutoStopTimezone || 'Africa/Tunis' }));

      // Check if it's a weekday (if weekdays only is enabled)
      const dayOfWeek = tunisiaTime.getDay(); // 0 = Sunday, 6 = Saturday
      if (settings.timerAutoStopWeekdaysOnly && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return;
      }

      // Check if current time matches the configured auto-stop time
      const currentHour = tunisiaTime.getHours();
      const currentMinute = tunisiaTime.getMinutes();

      this.logger.debug(`Timer check - Tunisia time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, Target: ${settings.timerAutoStopHour}:${settings.timerAutoStopMinute.toString().padStart(2, '0')}`);

      if (currentHour === settings.timerAutoStopHour && currentMinute === settings.timerAutoStopMinute) {
        this.logger.log(`Running scheduled end-of-day timer stop (${settings.timerAutoStopHour}:${settings.timerAutoStopMinute.toString().padStart(2, '0')})`);

        const result = await this.timeTrackingService.stopAllTimersEndOfDay(
          settings.timerAutoStopHour,
          settings.timerAutoStopMinute,
        );

        if (result.stoppedCount > 0) {
          this.logger.log(`Successfully stopped ${result.stoppedCount} timer(s)`);

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
          this.logger.log('No active timers to stop');
        }

        if (result.errors.length > 0) {
          this.logger.warn(`Encountered ${result.errors.length} error(s) while stopping timers`);
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
}
