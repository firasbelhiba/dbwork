import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface GoogleCalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  attendees?: string[]; // Email addresses
  createMeetLink?: boolean;
}

export interface GoogleMeetInfo {
  meetLink: string;
  meetId: string;
  conferenceId: string;
}

@Injectable()
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * Generate OAuth URL for user to authorize Google Calendar access
   */
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId to identify user in callback
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens and save to user
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Save tokens to user document
      await this.userModel.findByIdAndUpdate(userId, {
        'googleCalendar.accessToken': tokens.access_token,
        'googleCalendar.refreshToken': tokens.refresh_token,
        'googleCalendar.expiryDate': tokens.expiry_date,
        'googleCalendar.isConnected': true,
      });
    } catch (error) {
      console.error('[GoogleCalendar] Error exchanging code for tokens:', error);
      throw new BadRequestException('Failed to connect Google Calendar');
    }
  }

  /**
   * Get authenticated calendar client for a user
   */
  private async getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
    const user = await this.userModel.findById(userId).exec();

    if (!user?.googleCalendar?.isConnected) {
      throw new UnauthorizedException('Google Calendar not connected. Please connect your Google account first.');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: user.googleCalendar.accessToken,
      refresh_token: user.googleCalendar.refreshToken,
      expiry_date: user.googleCalendar.expiryDate,
    });

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        await this.userModel.findByIdAndUpdate(userId, {
          'googleCalendar.refreshToken': tokens.refresh_token,
        });
      }
      await this.userModel.findByIdAndUpdate(userId, {
        'googleCalendar.accessToken': tokens.access_token,
        'googleCalendar.expiryDate': tokens.expiry_date,
      });
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Create a Google Calendar event with optional Google Meet link
   */
  async createEvent(
    userId: string,
    eventData: GoogleCalendarEvent,
  ): Promise<{ eventId: string; meetInfo?: GoogleMeetInfo }> {
    const calendar = await this.getCalendarClient(userId);

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: eventData.attendees?.map(email => ({ email })),
    };

    // Add Google Meet conference if requested
    if (eventData.createMeetLink) {
      event.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      };
    }

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: eventData.createMeetLink ? 1 : 0,
        sendUpdates: 'all',
      });

      const result: { eventId: string; meetInfo?: GoogleMeetInfo } = {
        eventId: response.data.id!,
      };

      // Extract Meet link if created
      if (response.data.conferenceData?.entryPoints) {
        const videoEntry = response.data.conferenceData.entryPoints.find(
          ep => ep.entryPointType === 'video'
        );
        if (videoEntry) {
          result.meetInfo = {
            meetLink: videoEntry.uri!,
            meetId: videoEntry.meetingCode || '',
            conferenceId: response.data.conferenceData.conferenceId || '',
          };
        }
      }

      return result;
    } catch (error) {
      console.error('[GoogleCalendar] Error creating event:', error);
      console.error('[GoogleCalendar] Error details:', JSON.stringify(error.response?.data || error.message || error, null, 2));

      if (error.code === 401) {
        throw new UnauthorizedException('Google Calendar authorization expired. Please reconnect your account.');
      }

      // Provide more specific error message if available
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to create Google Calendar event';
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Update an existing Google Calendar event
   */
  async updateEvent(
    userId: string,
    googleEventId: string,
    eventData: Partial<GoogleCalendarEvent>,
  ): Promise<void> {
    const calendar = await this.getCalendarClient(userId);

    const event: calendar_v3.Schema$Event = {};

    if (eventData.title) event.summary = eventData.title;
    if (eventData.description) event.description = eventData.description;
    if (eventData.location) event.location = eventData.location;
    if (eventData.startDateTime) {
      event.start = {
        dateTime: eventData.startDateTime.toISOString(),
        timeZone: 'UTC',
      };
    }
    if (eventData.endDateTime) {
      event.end = {
        dateTime: eventData.endDateTime.toISOString(),
        timeZone: 'UTC',
      };
    }
    if (eventData.attendees) {
      event.attendees = eventData.attendees.map(email => ({ email }));
    }

    try {
      await calendar.events.patch({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: event,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('[GoogleCalendar] Error updating event:', error);
      throw new BadRequestException('Failed to update Google Calendar event');
    }
  }

  /**
   * Delete a Google Calendar event
   */
  async deleteEvent(userId: string, googleEventId: string): Promise<void> {
    const calendar = await this.getCalendarClient(userId);

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('[GoogleCalendar] Error deleting event:', error);
      // Don't throw if event doesn't exist
      if (error.code !== 404) {
        throw new BadRequestException('Failed to delete Google Calendar event');
      }
    }
  }

  /**
   * Check if user has Google Calendar connected
   */
  async isConnected(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('googleCalendar').exec();
    return !!user?.googleCalendar?.isConnected;
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: {
        'googleCalendar.accessToken': 1,
        'googleCalendar.refreshToken': 1,
        'googleCalendar.expiryDate': 1,
      },
      'googleCalendar.isConnected': false,
    });
  }
}
