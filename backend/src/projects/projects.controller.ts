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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, CreateCustomStatusDto, UpdateCustomStatusDto, ReorderCustomStatusesDto, CreateDemoEventDto, UpdateDemoEventDto } from './dto';
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
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Archive project' })
  @ApiResponse({ status: 200, description: 'Project successfully archived' })
  archive(@Param('id') id: string) {
    return this.projectsService.archive(id);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Restore archived project' })
  @ApiResponse({ status: 200, description: 'Project successfully restored' })
  restore(@Param('id') id: string) {
    return this.projectsService.restore(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete project (Admin only)' })
  @ApiResponse({ status: 200, description: 'Project successfully deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/members')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Add member to project' })
  @ApiResponse({ status: 200, description: 'Member successfully added' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.projectsService.addMember(id, addMemberDto);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiResponse({ status: 200, description: 'Member successfully removed' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeMember(id, userId);
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
  deleteDemoEvent(@Param('id') id: string, @Param('eventId') eventId: string) {
    return this.projectsService.deleteDemoEvent(id, eventId);
  }
}
