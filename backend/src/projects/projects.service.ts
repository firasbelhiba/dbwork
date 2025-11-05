import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, CreateCustomStatusDto, UpdateCustomStatusDto, ReorderCustomStatusesDto, CreateDemoEventDto, UpdateDemoEventDto } from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private activitiesService: ActivitiesService,
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
      lead: createProjectDto.lead || userId,
      members: [
        {
          userId: createProjectDto.lead || userId,
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
    const project = await this.projectModel.findById(id);

    if (!project) {
      throw new NotFoundException('Project not found');
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

  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
    actionUserId?: string,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Check if user is already a member
    const isMember = project.members.some(
      (member) => member.userId.toString() === addMemberDto.userId,
    );

    if (isMember) {
      throw new ConflictException('User is already a member of this project');
    }

    project.members.push({
      userId: addMemberDto.userId as any,
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

    return savedProject;
  }

  async removeMember(projectId: string, userId: string, actionUserId?: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Prevent removing the project lead
    if (project.lead.toString() === userId) {
      throw new BadRequestException('Cannot remove project lead from members');
    }

    project.members = project.members.filter(
      (member) => member.userId.toString() !== userId,
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

    const newEvent = {
      id: eventId,
      title: createDemoEventDto.title,
      description: createDemoEventDto.description || '',
      date: new Date(createDemoEventDto.date),
      location: createDemoEventDto.location || '',
      createdBy: userId as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    project.demoEvents.push(newEvent as any);

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

  async deleteDemoEvent(projectId: string, eventId: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const eventIndex = project.demoEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      throw new NotFoundException('Demo event not found');
    }

    project.demoEvents.splice(eventIndex, 1);

    return project.save();
  }
}
