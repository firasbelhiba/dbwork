import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  findByUser(@CurrentUser() user, @Query('unreadOnly') unreadOnly?: string) {
    console.log('[NotificationsController] User object:', {
      _id: user._id,
      _id_type: typeof user._id,
      _id_constructor: user._id?.constructor?.name,
      email: user.email,
    });
    return this.notificationsService.findByUser(
      user._id,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@CurrentUser() user) {
    return this.notificationsService.getUnreadCount(user._id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification information' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user) {
    return this.notificationsService.markAsRead(id, user._id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@CurrentUser() user) {
    return this.notificationsService.markAllAsRead(user._id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.notificationsService.remove(id, user._id);
  }

  @Delete('clear-all')
  @ApiOperation({ summary: 'Clear all read notifications' })
  @ApiResponse({ status: 200, description: 'Read notifications cleared' })
  clearAll(@CurrentUser() user) {
    return this.notificationsService.clearAll(user._id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to yourself (for testing real-time notifications)' })
  @ApiResponse({ status: 201, description: 'Test notification sent' })
  async sendTestNotification(@CurrentUser() user) {
    return this.notificationsService.create({
      userId: user._id.toString(),
      type: 'comment_mention' as any,
      title: 'Test Notification',
      message: `🔔 This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      link: '/notifications',
      metadata: { test: true },
    });
  }
}
