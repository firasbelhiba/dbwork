import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, AddMemberDto, UpdateMemberRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization successfully created' })
  @ApiResponse({ status: 409, description: 'Organization with this key already exists' })
  create(@Body() createOrganizationDto: CreateOrganizationDto, @CurrentUser() user) {
    return this.organizationsService.create(createOrganizationDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({ status: 200, description: 'Returns all organizations' })
  findAll(@Query('isArchived') isArchived?: string) {
    const filters: { isArchived?: boolean } = {};
    if (isArchived !== undefined) {
      filters.isArchived = isArchived === 'true';
    }
    return this.organizationsService.findAll(filters);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get organizations for current user' })
  @ApiResponse({ status: 200, description: 'Returns organizations where user is a member' })
  findMyOrganizations(@CurrentUser() user) {
    return this.organizationsService.findByUser(user._id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Returns the organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get organization by key' })
  @ApiResponse({ status: 200, description: 'Returns the organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findByKey(@Param('key') key: string) {
    return this.organizationsService.findByKey(key);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an organization' })
  @ApiResponse({ status: 200, description: 'Organization successfully updated' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Archive an organization' })
  @ApiResponse({ status: 200, description: 'Organization successfully archived' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  // Member management endpoints

  @Post(':id/members')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a member to organization' })
  @ApiResponse({ status: 200, description: 'Member successfully added' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.organizationsService.addMember(id, addMemberDto);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a member from organization' })
  @ApiResponse({ status: 200, description: 'Member successfully removed' })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove the creator' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.organizationsService.removeMember(id, userId);
  }

  @Patch(':id/members/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update member role in organization' })
  @ApiResponse({ status: 200, description: 'Member role successfully updated' })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(id, userId, updateMemberRoleDto);
  }

  // Logo management endpoints

  @Post(':id/logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload organization logo' })
  @ApiResponse({ status: 200, description: 'Logo successfully uploaded' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.organizationsService.uploadLogo(id, file);
  }

  @Delete(':id/logo')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove organization logo' })
  @ApiResponse({ status: 200, description: 'Logo successfully removed' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  removeLogo(@Param('id') id: string) {
    return this.organizationsService.removeLogo(id);
  }
}
