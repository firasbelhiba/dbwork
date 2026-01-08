import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, UpdateMemberRolesDto, CreateCustomStatusDto, UpdateCustomStatusDto, ReorderCustomStatusesDto, CreateDemoEventDto, UpdateDemoEventDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project successfully created' })
  @ApiResponse({ status: 409, description: 'Project key already exists' })
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user) {
    return this.projectsService.create(createProjectDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'List of all projects' })
  findAll(@Query() filters: any) {
    return this.projectsService.findAll(filters);
  }

  @Get('my-projects')
  @ApiOperation({ summary: 'Get projects where user is a member' })
  @ApiResponse({ status: 200, description: 'List of user projects' })
  findByUser(@CurrentUser() user) {
    return this.projectsService.findByUser(user._id);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get project by key' })
  @ApiResponse({ status: 200, description: 'Project information' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findByKey(@Param('key') key: string) {
    return this.projectsService.findByKey(key);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project information' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({ status: 200, description: 'Project statistics' })
  getStats(@Param('id') id: string) {
    return this.projectsService.getProjectStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project successfully updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @CurrentUser() user) {
    return this.projectsService.update(id, updateProjectDto, user._id);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Archive project' })
  @ApiResponse({ status: 200, description: 'Project successfully archived' })
  archive(@Param('id') id: string, @CurrentUser() user) {
    return this.projectsService.archive(id, user._id);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Restore archived project' })
  @ApiResponse({ status: 200, description: 'Project successfully restored' })
  restore(@Param('id') id: string, @CurrentUser() user) {
    return this.projectsService.restore(id, user._id);
  }

  @Post(':id/logo')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload project logo' })
  @ApiResponse({ status: 200, description: 'Logo successfully uploaded' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.projectsService.uploadLogo(id, file, user._id);
  }

  @Delete(':id/logo')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove project logo' })
  @ApiResponse({ status: 200, description: 'Logo successfully removed' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  removeLogo(@Param('id') id: string, @CurrentUser() user) {
    return this.projectsService.removeLogo(id, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete project (Admin only)' })
  @ApiResponse({ status: 200, description: 'Project successfully deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.projectsService.remove(id, user._id);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Add member to project' })
  @ApiResponse({ status: 200, description: 'Member successfully added' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto, @CurrentUser() user) {
    return this.projectsService.addMember(id, addMemberDto, user._id);
  }

  @Patch(':id/members/:userId/roles')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update member roles in project' })
  @ApiResponse({ status: 200, description: 'Member roles successfully updated' })
  @ApiResponse({ status: 404, description: 'User is not a member of this project' })
  updateMemberRoles(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateMemberRolesDto: UpdateMemberRolesDto,
    @CurrentUser() user,
  ) {
    return this.projectsService.updateMemberRoles(id, userId, updateMemberRolesDto.projectRoles, user._id);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiResponse({ status: 200, description: 'Member successfully removed' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user) {
    return this.projectsService.removeMember(id, userId, user._id);
  }

  @Post(':id/statuses')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Add custom status to project' })
  @ApiResponse({ status: 201, description: 'Custom status successfully added' })
  addCustomStatus(@Param('id') id: string, @Body() createCustomStatusDto: CreateCustomStatusDto) {
    return this.projectsService.addCustomStatus(id, createCustomStatusDto);
  }

  @Patch(':id/statuses/:statusId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update custom status' })
  @ApiResponse({ status: 200, description: 'Custom status successfully updated' })
  updateCustomStatus(
    @Param('id') id: string,
    @Param('statusId') statusId: string,
    @Body() updateCustomStatusDto: UpdateCustomStatusDto
  ) {
    return this.projectsService.updateCustomStatus(id, statusId, updateCustomStatusDto);
  }

  @Delete(':id/statuses/:statusId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Delete custom status' })
  @ApiResponse({ status: 200, description: 'Custom status successfully deleted' })
  deleteCustomStatus(@Param('id') id: string, @Param('statusId') statusId: string) {
    return this.projectsService.deleteCustomStatus(id, statusId);
  }

  @Post(':id/statuses/reorder')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Reorder custom statuses' })
  @ApiResponse({ status: 200, description: 'Custom statuses successfully reordered' })
  reorderCustomStatuses(
    @Param('id') id: string,
    @Body() reorderCustomStatusesDto: ReorderCustomStatusesDto
  ) {
    return this.projectsService.reorderCustomStatuses(id, reorderCustomStatusesDto);
  }

  @Post(':id/demo-events')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Create demo event' })
  @ApiResponse({ status: 201, description: 'Demo event successfully created' })
  createDemoEvent(
    @Param('id') id: string,
    @Body() createDemoEventDto: CreateDemoEventDto,
    @CurrentUser() user
  ) {
    return this.projectsService.createDemoEvent(id, createDemoEventDto, user._id);
  }

  @Get(':id/demo-events')
  @ApiOperation({ summary: 'Get all demo events for project' })
  @ApiResponse({ status: 200, description: 'List of demo events' })
  getDemoEvents(@Param('id') id: string) {
    return this.projectsService.getDemoEvents(id);
  }

  @Patch(':id/demo-events/:eventId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Update demo event' })
  @ApiResponse({ status: 200, description: 'Demo event successfully updated' })
  updateDemoEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() updateDemoEventDto: UpdateDemoEventDto
  ) {
    return this.projectsService.updateDemoEvent(id, eventId, updateDemoEventDto);
  }

  @Delete(':id/demo-events/:eventId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Delete demo event' })
  @ApiResponse({ status: 200, description: 'Demo event successfully deleted' })
  deleteDemoEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user,
  ) {
    return this.projectsService.deleteDemoEvent(id, eventId, user._id.toString());
  }
}
