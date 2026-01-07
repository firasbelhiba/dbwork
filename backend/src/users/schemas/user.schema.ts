import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '@common/enums';
import { UserPreferences } from '@common/interfaces';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ default: null })
  avatarCloudinaryId: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.DEVELOPER
  })
  role: UserRole;

  @Prop({ type: Object, default: {
    theme: 'system',
    emailNotifications: {
      issueAssigned: true,
      issueUpdated: true,
      issueCommented: true,
      mentions: true,
      sprintUpdates: true,
    },
    notificationPreferences: {
      // Issue notifications
      issue_assigned: true,
      issue_updated: true,
      issue_commented: true,
      issue_status_changed: true,
      issue_priority_changed: true,
      issue_due_date_changed: true,
      // Comment notifications
      comment_on_issue: true,
      comment_mention: true,
      comment_reply: true,
      // General mentions
      mention: true,
      // Sprint notifications
      sprint_started: true,
      sprint_completed: true,
      sprint_issue_added: true,
      sprint_starting_soon: true,
      sprint_ending_soon: true,
      // Project notifications
      project_invitation: true,
      project_member_added: true,
      project_member_removed: true,
      project_role_changed: true,
      project_archived: true,
      project_deleted: true,
      // Feedback notifications
      feedback_upvoted: true,
      feedback_status_changed: true,
      feedback_commented: true,
      // Changelog notifications
      new_changelog: true,
    },
    language: 'en',
  }})
  preferences: UserPreferences;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt: Date;

  @Prop({ default: null })
  refreshToken: string;

  @Prop({ type: Object, default: {
    totalPoints: 0,
    issuesCompleted: 0,
    bugsFixed: 0,
    issuesCreated: 0,
    commentsPosted: 0,
    uniqueIssuesCommented: 0,
    helpedOthersIssues: 0,
    mentionsReceived: 0,
    projectsAssigned: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  }})
  stats: {
    totalPoints: number;
    issuesCompleted: number;
    bugsFixed: number;
    issuesCreated: number;
    commentsPosted: number;
    uniqueIssuesCommented: number;
    helpedOthersIssues: number;
    mentionsReceived: number;
    projectsAssigned: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
  };

  // Track which issues have been counted for achievements to prevent cheating
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  completedIssuesForAchievements: Types.ObjectId[];

  // Track which issues have been commented on (for unique count)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  commentedIssues: Types.ObjectId[];

  // Track which issues user helped complete (not assigned to them)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  helpedIssues: Types.ObjectId[];

  // Track the last changelog version the user has seen
  @Prop({ default: null })
  lastSeenChangelogVersion: string;

  // Gmail email for Google Calendar integration (may differ from account email)
  @Prop({ default: null })
  gmailEmail: string;

  // Personal todo queue - ordered list of issue IDs for auto-progression
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  todoQueue: Types.ObjectId[];

  // Google Calendar integration
  @Prop({ type: Object, default: {
    isConnected: false,
    accessToken: null,
    refreshToken: null,
    expiryDate: null,
  }})
  googleCalendar: {
    isConnected: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    expiryDate: number | null;
  };

  // Organization assignments (users can belong to multiple organizations)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Organization' }], default: [] })
  organizationIds: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ organizationIds: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.refreshToken;
    // Don't expose Google tokens, only connection status
    if (ret.googleCalendar) {
      ret.googleCalendar = { isConnected: ret.googleCalendar.isConnected } as any;
    }
    return ret;
  },
});
