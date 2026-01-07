import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateOrganizationDto, UpdateOrganizationDto, AddMemberDto, UpdateMemberRoleDto } from './dto';
import { UserRole } from '@common/enums';
import { getCloudinary } from '../attachments/cloudinary.config';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, userId: string): Promise<OrganizationDocument> {
    // Check if key already exists
    const existingOrg = await this.organizationModel.findOne({
      key: createOrganizationDto.key.toUpperCase(),
    });

    if (existingOrg) {
      throw new ConflictException(`Organization with key "${createOrganizationDto.key}" already exists`);
    }

    const organization = new this.organizationModel({
      ...createOrganizationDto,
      key: createOrganizationDto.key.toUpperCase(),
      creator: new Types.ObjectId(userId),
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: UserRole.ADMIN,
          addedAt: new Date(),
        },
      ],
    });

    const savedOrg = await organization.save();

    return this.findOne(savedOrg._id.toString());
  }

  async findAll(filters: { isArchived?: boolean } = {}): Promise<OrganizationDocument[]> {
    const query: any = {};

    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    } else {
      query.isArchived = false; // Default to non-archived
    }

    return this.organizationModel
      .find(query)
      .populate('creator', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel
      .findById(id)
      .populate('creator', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findByKey(key: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel
      .findOne({ key: key.toUpperCase() })
      .populate('creator', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Handle archiving
    if (updateOrganizationDto.isArchived && !organization.isArchived) {
      updateOrganizationDto['archivedAt'] = new Date();
    } else if (updateOrganizationDto.isArchived === false && organization.isArchived) {
      updateOrganizationDto['archivedAt'] = null;
    }

    const updated = await this.organizationModel
      .findByIdAndUpdate(id, updateOrganizationDto, { new: true })
      .populate('creator', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .exec();

    return updated;
  }

  async remove(id: string): Promise<void> {
    const organization = await this.organizationModel.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Soft delete - archive instead of hard delete
    organization.isArchived = true;
    organization.archivedAt = new Date();
    await organization.save();
  }

  async addMember(organizationId: string, addMemberDto: AddMemberDto): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user exists
    const user = await this.userModel.findById(addMemberDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const isMember = organization.members.some(
      (m) => m.userId.toString() === addMemberDto.userId,
    );

    if (isMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    organization.members.push({
      userId: new Types.ObjectId(addMemberDto.userId),
      role: addMemberDto.role || UserRole.DEVELOPER,
      addedAt: new Date(),
    });

    await organization.save();

    return this.findOne(organizationId);
  }

  async removeMember(organizationId: string, userId: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is a member
    const memberIndex = organization.members.findIndex(
      (m) => m.userId.toString() === userId,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('User is not a member of this organization');
    }

    // Prevent removing the creator
    if (organization.creator.toString() === userId) {
      throw new BadRequestException('Cannot remove the creator from the organization');
    }

    organization.members.splice(memberIndex, 1);
    await organization.save();

    return this.findOne(organizationId);
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
  ): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Find the member
    const member = organization.members.find(
      (m) => m.userId.toString() === userId,
    );

    if (!member) {
      throw new NotFoundException('User is not a member of this organization');
    }

    member.role = updateMemberRoleDto.role;
    await organization.save();

    return this.findOne(organizationId);
  }

  async uploadLogo(id: string, file: Express.Multer.File): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const cloudinary = getCloudinary();

    // Delete old logo if exists
    if (organization.logoCloudinaryId) {
      try {
        await cloudinary.uploader.destroy(organization.logoCloudinaryId);
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }

    // Upload new logo
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'organization-logos',
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'limit' },
          ],
        },
        async (error, result) => {
          if (error) {
            reject(error);
          } else {
            organization.logo = result.secure_url;
            organization.logoCloudinaryId = result.public_id;
            await organization.save();
            resolve(this.findOne(id));
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async removeLogo(id: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const cloudinary = getCloudinary();

    // Delete logo from Cloudinary
    if (organization.logoCloudinaryId) {
      try {
        await cloudinary.uploader.destroy(organization.logoCloudinaryId);
      } catch (error) {
        console.error('Error deleting logo:', error);
      }
    }

    organization.logo = undefined;
    organization.logoCloudinaryId = undefined;
    await organization.save();

    return this.findOne(id);
  }

  // Get organizations for a specific user
  async findByUser(userId: string): Promise<OrganizationDocument[]> {
    return this.organizationModel
      .find({
        'members.userId': new Types.ObjectId(userId),
        isArchived: false,
      })
      .populate('creator', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }
}
