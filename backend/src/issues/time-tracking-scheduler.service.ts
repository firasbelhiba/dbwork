import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TimeTrackingService } from './time-tracking.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class TimeTrackingSchedulerService {
  private readonly logger = new Logger(TimeTrackingSchedulerService.name);

  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly webSocketGateway: AppWebSocketGateway,
  ) {}

  /**
   * Stop all active timers at 5:30 PM every weekday (Monday-Friday)
   * Cron format: second minute hour day-of-month month day-of-week
   * 0 30 17 * * 1-5 = At 17:30:00 on every day-of-week from Monday through Friday
   *
   * FOR TESTING: Changed to 13:00 PM - change back to '0 30 17 * * 1-5' after testing
   */
  @Cron('0 0 13 * * *', {
    name: 'end-of-day-timer-stop',
    timeZone: 'Africa/Tunis', // Tunisia timezone (UTC+1)
  })
  async handleEndOfDayTimerStop() {
    this.logger.log('Running scheduled end-of-day timer stop (13:00 PM - TEST MODE)');

    try {
      const result = await this.timeTrackingService.stopAllTimersEndOfDay();

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
    } catch (error) {
      this.logger.error('Failed to run end-of-day timer stop', error.stack);
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
