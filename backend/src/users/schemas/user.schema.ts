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
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

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
    return ret;
  },
});
