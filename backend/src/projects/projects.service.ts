import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, CreateCustomStatusDto, UpdateCustomStatusDto, ReorderCustomStatusesDto, CreateDemoEventDto, UpdateDemoEventDto } from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { ChatService } from '../chat/chat.service';
import { getCloudinary } from '../attachments/cloudinary.config';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
    private achievementsService: AchievementsService,
    @Inject(forwardRef(() => GoogleCalendarService))
    private googleCalendarService: GoogleCalendarService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<ProjectDocument> {
    // Check if project key already exists
    const existingProject = await this.projectModel
      .findOne({ key: createProjectDto.key.toUpperCase() })
      .exec();

    if (existingProject) {
      throw new ConflictException('Project with this key already exists');
    }

    const project = new this.projectModel({
      ...createProjectDto,
      key: createProjectDto.key.toUpperCase(),
      lead: new Types.ObjectId(createProjectDto.lead || userId),
      members: [
        {
          userId: new Types.ObjectId(createProjectDto.lead || userId),
          addedAt: new Date(),
        },
      ],
    });

    const savedProject = await project.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.CREATED,
      EntityType.PROJECT,
      savedProject._id.toString(),
      savedProject.name,
      savedProject._id.toString(),
    );

    // Create project group chat conversation
    try {
      const memberIds = savedProject.members.map(m => m.userId.toString());
      await this.chatService.createProjectConversation(
        savedProject._id.toString(),
        savedProject.name,
        memberIds,
      );
    } catch (error) {
      console.error('[ProjectsService] Error creating project chat:', error);
    }

    return savedProject;
  }

  async findAll(filters: any = {}): Promise<ProjectDocument[]> {
    const query: any = {};

    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived === 'true';
    }

    return this.projectModel
      .find(query)
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<ProjectDocument[]> {
    return this.projectModel
      .find({
        $or: [{ lead: userId }, { 'members.userId': userId }],
      })
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findById(id)
      .populate('lead', 'firstName lastName email avatar role isActive createdAt lastLoginAt preferences')
      .populate('members.userId', 'firstName lastName email avatar role isActive createdAt lastLoginAt preferences')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Clean up orphaned members (users that were deleted)
    const originalMemberCount = project.members.length;
    project.members = project.members.filter((member) => member.userId !== null);

    // If we removed any orphaned members, save the project
    if (project.members.length < originalMemberCount) {
      await project.save();
    }

    return project;
  }

  async findByKey(key: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findOne({ key: key.toUpperCase() })
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId?: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, updateProjectDto, { new: true })
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.UPDATED,
        EntityType.PROJECT,
        project._id.toString(),
        project.name,
        project._id.toString(),
      );
    }

    return project;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const project = await this.projectModel
      .findById(id)
      .populate('members.userId', '_id')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Notify all project members before deleting
    try {
      if (userId && project.members) {
        for (const member of project.members) {
          if (!member.userId) continue;

          let memberId: string;
          if (typeof member.userId === 'object') {
            memberId = (member.userId as any)._id?.toString() || member.userId!.toString();
          } else {
            memberId = String(member.userId);
          }

          if (memberId !== userId) {
            await this.notificationsService.notifyProjectDeleted(
              memberId,
              project.key,
              project.name,
              userId,
            );
          }
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying project deleted:', error);
    }

    const result = await this.projectModel.findByIdAndDelete(id).exec();

    // Log activity
    if (userId && result) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.DELETED,
        EntityType.PROJECT,
        result._id.toString(),
        result.name,
        result._id.toString(),
      );
    }
  }

  async archive(id: string, userId?: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        { isArchived: true, archivedAt: new Date() },
        { new: true },
      )
      .populate('members.userId', '_id')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.ARCHIVED,
        EntityType.PROJECT,
        project._id.toString(),
        project.name,
        project._id.toString(),
      );
    }

    // Notify all project members
    try {
      if (userId && project.members) {
        for (const member of project.members) {
          if (!member.userId) continue;

          let memberId: string;
          if (typeof member.userId === 'object') {
            memberId = (member.userId as any)._id?.toString() || member.userId!.toString();
          } else {
            memberId = String(member.userId);
          }

          if (memberId !== userId) {
            await this.notificationsService.notifyProjectArchived(
              memberId,
              project.key,
              project.name,
              userId,
            );
          }
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying project archived:', error);
    }

    return project;
  }

  async restore(id: string, userId?: string): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        { isArchived: false, archivedAt: null },
        { new: true },
      )
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.RESTORED,
        EntityType.PROJECT,
        project._id.toString(),
        project.name,
        project._id.toString(),
      );
    }

    return project;
  }

  async uploadLogo(id: string, file: Express.Multer.File, userId?: string): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cloudinary = getCloudinary();

    // Delete old logo from Cloudinary if it exists
    if (project.logoCloudinaryId) {
      try {
        await cloudinary.uploader.destroy(project.logoCloudinaryId);
      } catch (error) {
        console.error('Error deleting old logo from Cloudinary:', error);
      }
    }

    // Upload new logo to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'project-logos',
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    // Update project with new logo URL and Cloudinary ID
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        id,
        { logo: result.secure_url, logoCloudinaryId: result.public_id },
        { new: true },
      )
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!updatedProject) {
      throw new NotFoundException('Project not found after logo upload');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.UPDATED,
        EntityType.PROJECT,
        updatedProject._id.toString(),
        updatedProject.name,
        updatedProject._id.toString(),
        { field: 'logo', action: 'uploaded' },
      );
    }

    return updatedProject;
  }

  async removeLogo(id: string, userId?: string): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cloudinary = getCloudinary();

    // Delete logo from Cloudinary if it exists
    if (project.logoCloudinaryId) {
      try {
        await cloudinary.uploader.destroy(project.logoCloudinaryId);
      } catch (error) {
        console.error('Error deleting logo from Cloudinary:', error);
      }
    }

    // Remove logo from project
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        id,
        { logo: null, logoCloudinaryId: null },
        { new: true },
      )
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!updatedProject) {
      throw new NotFoundException('Project not found after logo removal');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.UPDATED,
        EntityType.PROJECT,
        updatedProject._id.toString(),
        updatedProject.name,
        updatedProject._id.toString(),
        { field: 'logo', action: 'removed' },
      );
    }

    return updatedProject;
  }

  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
    actionUserId?: string,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Check if user is already a member
    const isMember = project.members.some(
      (member) => member.userId.toString() === addMemberDto.userId.toString(),
    );

    if (isMember) {
      throw new ConflictException('User is already a member of this project');
    }

    project.members.push({
      userId: new Types.ObjectId(addMemberDto.userId),
      projectRole: addMemberDto.projectRole || 'member',
      addedAt: new Date(),
    } as any);

    const savedProject = await project.save();

    // Log activity
    if (actionUserId) {
      await this.activitiesService.logActivity(
        actionUserId,
        ActionType.ADDED_MEMBER,
        EntityType.PROJECT,
        savedProject._id.toString(),
        savedProject.name,
        savedProject._id.toString(),
        { addedUserId: addMemberDto.userId },
      );
    }

    // Notify the added user
    try {
      if (actionUserId && addMemberDto.userId !== actionUserId) {
        await this.notificationsService.notifyProjectMemberAdded(
          addMemberDto.userId,
          savedProject.key,
          savedProject.name,
          actionUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying project member added:', error);
    }

    // Check project assignment achievement for the added user
    try {
      await this.achievementsService.checkProjectAssignmentAchievements(addMemberDto.userId);
    } catch (error) {
      console.error('[ACHIEVEMENTS] Error checking project assignment achievements:', error);
    }

    // Add user to project chat conversation
    try {
      await this.chatService.addParticipantToProjectChat(projectId, addMemberDto.userId);
    } catch (error) {
      console.error('[CHAT] Error adding user to project chat:', error);
    }

    return savedProject;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    projectRole: string,
    actionUserId?: string,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Find the member - handle both populated and non-populated userId
    const memberIndex = project.members.findIndex((member) => {
      if (!member.userId) return false;
      const memberId = typeof member.userId === 'object'
        ? (member.userId as any)._id?.toString() || String(member.userId)
        : String(member.userId);
      return memberId === userId.toString();
    });

    if (memberIndex === -1) {
      throw new NotFoundException('User is not a member of this project');
    }

    // Update the role using updateOne to avoid populated object issues
    await this.projectModel.updateOne(
      { _id: projectId, 'members.userId': new Types.ObjectId(userId) },
      { $set: { 'members.$.projectRole': projectRole } },
    );

    // Fetch and return the updated project
    const savedProject = await this.findOne(projectId);

    // Log activity
    if (actionUserId) {
      await this.activitiesService.logActivity(
        actionUserId,
        ActionType.UPDATED,
        EntityType.PROJECT,
        savedProject._id.toString(),
        savedProject.name,
        savedProject._id.toString(),
        { updatedUserId: userId, newRole: projectRole },
      );
    }

    return savedProject;
  }

  async removeMember(projectId: string, userId: string, actionUserId?: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Prevent removing the project lead
    if (project.lead.toString() === userId.toString()) {
      throw new BadRequestException('Cannot remove project lead from members');
    }

    project.members = project.members.filter(
      (member) => member.userId.toString() !== userId.toString(),
    );

    const savedProject = await project.save();

    // Log activity
    if (actionUserId) {
      await this.activitiesService.logActivity(
        actionUserId,
        ActionType.REMOVED_MEMBER,
        EntityType.PROJECT,
        savedProject._id.toString(),
        savedProject.name,
        savedProject._id.toString(),
        { removedUserId: userId },
      );
    }

    // Notify the removed user
    try {
      if (actionUserId && userId !== actionUserId) {
        await this.notificationsService.notifyProjectMemberRemoved(
          userId,
          savedProject.key,
          savedProject.name,
          actionUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying project member removed:', error);
    }

    // Remove user from project chat conversation
    try {
      await this.chatService.removeParticipantFromProjectChat(projectId, userId);
    } catch (error) {
      console.error('[CHAT] Error removing user from project chat:', error);
    }

    return savedProject;
  }

  async getProjectStats(projectId: string): Promise<any> {
    const project = await this.findOne(projectId);

    // This will be enhanced when Issues module is complete
    return {
      projectId: project._id,
      name: project.name,
      key: project.key,
      memberCount: project.members.length,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
    };
  }

  async addCustomStatus(
    projectId: string,
    createCustomStatusDto: CreateCustomStatusDto,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Generate a unique ID for the custom status
    const statusId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get the next order number
    const maxOrder = Math.max(...project.customStatuses.map(s => s.order), -1);

    const newStatus = {
      id: statusId,
      name: createCustomStatusDto.name,
      color: createCustomStatusDto.color,
      order: maxOrder + 1,
      isDefault: false,
    };

    project.customStatuses.push(newStatus as any);

    return project.save();
  }

  async updateCustomStatus(
    projectId: string,
    statusId: string,
    updateCustomStatusDto: UpdateCustomStatusDto,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const statusIndex = project.customStatuses.findIndex(s => s.id === statusId);

    if (statusIndex === -1) {
      throw new NotFoundException('Custom status not found');
    }

    // Prevent updating default statuses
    if (project.customStatuses[statusIndex].isDefault && updateCustomStatusDto.name) {
      throw new BadRequestException('Cannot rename default statuses');
    }

    if (updateCustomStatusDto.name) {
      project.customStatuses[statusIndex].name = updateCustomStatusDto.name;
    }

    if (updateCustomStatusDto.color) {
      project.customStatuses[statusIndex].color = updateCustomStatusDto.color;
    }

    if (updateCustomStatusDto.order !== undefined) {
      project.customStatuses[statusIndex].order = updateCustomStatusDto.order;
    }

    return project.save();
  }

  async deleteCustomStatus(projectId: string, statusId: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const statusIndex = project.customStatuses.findIndex(s => s.id === statusId);

    if (statusIndex === -1) {
      throw new NotFoundException('Custom status not found');
    }

    // Prevent deleting default statuses
    if (project.customStatuses[statusIndex].isDefault) {
      throw new BadRequestException('Cannot delete default statuses');
    }

    // Ensure at least one status remains
    if (project.customStatuses.length <= 1) {
      throw new BadRequestException('Cannot delete the last status');
    }

    project.customStatuses.splice(statusIndex, 1);

    return project.save();
  }

  async reorderCustomStatuses(
    projectId: string,
    reorderCustomStatusesDto: ReorderCustomStatusesDto,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const { statusIds } = reorderCustomStatusesDto;

    // Validate that all status IDs exist
    const allStatusIds = project.customStatuses.map(s => s.id);
    const invalidIds = statusIds.filter(id => !allStatusIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid status IDs: ${invalidIds.join(', ')}`);
    }

    // Reorder statuses
    statusIds.forEach((id, index) => {
      const statusIndex = project.customStatuses.findIndex(s => s.id === id);
      if (statusIndex !== -1) {
        project.customStatuses[statusIndex].order = index;
      }
    });

    // Sort by order
    project.customStatuses.sort((a, b) => a.order - b.order);

    return project.save();
  }

  async createDemoEvent(
    projectId: string,
    createDemoEventDto: CreateDemoEventDto,
    userId: string,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate end date (default 1 hour after start if not provided)
    const startDate = new Date(createDemoEventDto.date);
    let endDate: Date;

    if (createDemoEventDto.endDate) {
      endDate = new Date(createDemoEventDto.endDate);
    } else {
      // Default to 1 hour after start
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    // Validate dates
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date');
    }
    if (isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid end date');
    }
    // Ensure end is after start
    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
    }

    console.log('[DemoEvent] Creating event with dates:', { startDate, endDate });

    // Collect attendee emails
    let attendeeEmails: string[] = createDemoEventDto.attendees || [];

    // If inviteAllMembers is true, get all project members' emails
    if (createDemoEventDto.inviteAllMembers && project.members.length > 0) {
      const memberIds = project.members.map(m => m.userId);
      const members = await this.userModel
        .find({ _id: { $in: memberIds } })
        .select('email')
        .exec();
      const memberEmails = members.map(m => m.email);
      attendeeEmails = [...new Set([...attendeeEmails, ...memberEmails])];
    }

    const newEvent: any = {
      id: eventId,
      title: createDemoEventDto.title,
      description: createDemoEventDto.description || '',
      date: startDate,
      endDate: endDate,
      location: createDemoEventDto.location || '',
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
      googleEventId: null,
      googleMeetLink: null,
      googleMeetId: null,
      attendees: attendeeEmails,
    };

    // Create Google Calendar event with Meet link if requested
    if (createDemoEventDto.createGoogleMeet) {
      try {
        const isConnected = await this.googleCalendarService.isConnected(userId);

        if (!isConnected) {
          throw new BadRequestException(
            'Google Calendar not connected. Please connect your Google account in Profile settings first.'
          );
        }

        const googleResult = await this.googleCalendarService.createEvent(userId, {
          title: createDemoEventDto.title,
          description: createDemoEventDto.description || `Project: ${project.name}`,
          startDateTime: startDate,
          endDateTime: endDate,
          location: createDemoEventDto.location,
          attendees: attendeeEmails,
          createMeetLink: true,
        });

        newEvent.googleEventId = googleResult.eventId;
        if (googleResult.meetInfo) {
          newEvent.googleMeetLink = googleResult.meetInfo.meetLink;
          newEvent.googleMeetId = googleResult.meetInfo.meetId;
        }
      } catch (error) {
        console.error('[ProjectsService] Error creating Google Calendar event:', error);
        // If it's our own BadRequestException, rethrow it
        if (error instanceof BadRequestException) {
          throw error;
        }
        // Otherwise, continue without Google integration but warn
        console.warn('[ProjectsService] Creating event without Google Calendar integration');
      }
    }

    project.demoEvents.push(newEvent);

    // Notify all attendees about the new event
    for (const email of attendeeEmails) {
      try {
        const attendee = await this.userModel.findOne({ email }).exec();
        if (attendee && attendee._id.toString() !== userId) {
          await this.notificationsService.create({
            userId: attendee._id.toString(),
            type: 'project_invitation' as any, // Reuse existing type
            title: 'New Calendar Event',
            message: `You've been invited to "${createDemoEventDto.title}" in project ${project.name}${newEvent.googleMeetLink ? ' (Google Meet link included)' : ''}`,
            link: `/projects/${projectId}?tab=calendar`,
            metadata: {
              projectId,
              eventId,
              meetLink: newEvent.googleMeetLink,
            },
          });
        }
      } catch (error) {
        console.error(`[ProjectsService] Error notifying attendee ${email}:`, error);
      }
    }

    return project.save();
  }

  async getDemoEvents(projectId: string): Promise<any[]> {
    const project = await this.projectModel
      .findById(projectId)
      .populate('demoEvents.createdBy', 'firstName lastName email avatar')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project.demoEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async updateDemoEvent(
    projectId: string,
    eventId: string,
    updateDemoEventDto: UpdateDemoEventDto,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const eventIndex = project.demoEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      throw new NotFoundException('Demo event not found');
    }

    if (updateDemoEventDto.title) {
      project.demoEvents[eventIndex].title = updateDemoEventDto.title;
    }

    if (updateDemoEventDto.description !== undefined) {
      project.demoEvents[eventIndex].description = updateDemoEventDto.description;
    }

    if (updateDemoEventDto.date) {
      project.demoEvents[eventIndex].date = new Date(updateDemoEventDto.date);
    }

    if (updateDemoEventDto.location !== undefined) {
      project.demoEvents[eventIndex].location = updateDemoEventDto.location;
    }

    project.demoEvents[eventIndex].updatedAt = new Date();

    return project.save();
  }

  async deleteDemoEvent(projectId: string, eventId: string, userId: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const eventIndex = project.demoEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      throw new NotFoundException('Demo event not found');
    }

    const event = project.demoEvents[eventIndex];

    // Delete Google Calendar event if it exists
    if (event.googleEventId) {
      try {
        await this.googleCalendarService.deleteEvent(userId, event.googleEventId);
      } catch (error) {
        console.error('[ProjectsService] Error deleting Google Calendar event:', error);
        // Continue with local deletion even if Google deletion fails
      }
    }

    project.demoEvents.splice(eventIndex, 1);

    return project.save();
  }
}
