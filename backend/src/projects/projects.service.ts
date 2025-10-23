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
import { CreateProjectDto, UpdateProjectDto, AddMemberDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
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
          role: 'project_manager',
          addedAt: new Date(),
        },
      ],
    });

    return project.save();
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
      .populate('lead', 'firstName lastName email avatar role')
      .populate('members.userId', 'firstName lastName email avatar role')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
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

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, updateProjectDto, { new: true })
      .populate('lead', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Project not found');
    }
  }

  async archive(id: string): Promise<ProjectDocument> {
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

    return project;
  }

  async restore(id: string): Promise<ProjectDocument> {
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

    return project;
  }

  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
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
      role: addMemberDto.role,
      addedAt: new Date(),
    });

    return project.save();
  }

  async removeMember(projectId: string, userId: string): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    // Prevent removing the project lead
    if (project.lead.toString() === userId) {
      throw new BadRequestException('Cannot remove project lead from members');
    }

    project.members = project.members.filter(
      (member) => member.userId.toString() !== userId,
    );

    return project.save();
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: string,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(projectId);

    const member = project.members.find(
      (m) => m.userId.toString() === userId,
    );

    if (!member) {
      throw new NotFoundException('Member not found in project');
    }

    member.role = role as any;
    return project.save();
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
}
