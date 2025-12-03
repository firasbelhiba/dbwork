import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, Public } from '@common/decorators';

@ApiTags('Google Calendar')
@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google OAuth URL to connect calendar' })
  @ApiResponse({ status: 200, description: 'Returns OAuth URL' })
  getAuthUrl(@CurrentUser() user): { url: string } {
    const url = this.googleCalendarService.getAuthUrl(user._id.toString());
    return { url };
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend after authorization' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';

    if (error) {
      // User denied access or error occurred
      res.redirect(`${frontendUrl}/profile?google_calendar=error&reason=${error}`);
      return;
    }

    try {
      await this.googleCalendarService.handleCallback(code, userId);
      res.redirect(`${frontendUrl}/profile?google_calendar=connected`);
    } catch (err) {
      console.error('[GoogleCalendar] Callback error:', err);
      res.redirect(`${frontendUrl}/profile?google_calendar=error&reason=auth_failed`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if Google Calendar is connected' })
  @ApiResponse({ status: 200, description: 'Returns connection status' })
  async getStatus(@CurrentUser() user): Promise<{ isConnected: boolean }> {
    const isConnected = await this.googleCalendarService.isConnected(user._id.toString());
    return { isConnected };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Google Calendar' })
  @ApiResponse({ status: 200, description: 'Calendar disconnected successfully' })
  async disconnect(@CurrentUser() user): Promise<{ message: string }> {
    await this.googleCalendarService.disconnect(user._id.toString());
    return { message: 'Google Calendar disconnected successfully' };
  }
}
