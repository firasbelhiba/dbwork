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
import { IssuesService } from './issues.service';
import { CreateIssueDto, UpdateIssueDto, FilterIssuesDto, AddTimeLogDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new issue' })
  @ApiResponse({ status: 201, description: 'Issue successfully created' })
  create(@Body() createIssueDto: CreateIssueDto, @CurrentUser() user) {
    return this.issuesService.create(createIssueDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all issues with filters' })
  @ApiResponse({ status: 200, description: 'List of issues' })
  findAll(@Query() filterDto: FilterIssuesDto) {
    return this.issuesService.findAll(filterDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search issues' })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Query('q') query: string, @Query('projectId') projectId?: string) {
    return this.issuesService.search(query, projectId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get issues by project' })
  @ApiResponse({ status: 200, description: 'Project issues' })
  getByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('isArchived') isArchived?: string,
    @Query('assignedTo') assignedTo?: string,
    @CurrentUser() user?,
  ) {
    return this.issuesService.getIssuesByProject(projectId, status, isArchived, assignedTo, user?._id);
  }

  @Get('project/:projectId/backlog')
  @ApiOperation({ summary: 'Get project backlog' })
  @ApiResponse({ status: 200, description: 'Backlog issues' })
  getBacklog(@Param('projectId') projectId: string) {
    return this.issuesService.getBacklog(projectId);
  }

  @Get('sprint/:sprintId')
  @ApiOperation({ summary: 'Get issues by sprint' })
  @ApiResponse({ status: 200, description: 'Sprint issues' })
  getBySprint(
    @Param('sprintId') sprintId: string,
    @Query('isArchived') isArchived?: string,
    @Query('assignedTo') assignedTo?: string,
    @CurrentUser() user?,
  ) {
    return this.issuesService.getIssuesBySprint(sprintId, isArchived, assignedTo, user?._id);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get issue by key' })
  @ApiResponse({ status: 200, description: 'Issue information' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  findByKey(@Param('key') key: string) {
    return this.issuesService.findByKey(key);
  }

  @Get(':id/sub-issues')
  @ApiOperation({ summary: 'Get sub-issues of a parent issue' })
  @ApiResponse({ status: 200, description: 'List of sub-issues' })
  getSubIssues(@Param('id') id: string) {
    return this.issuesService.getSubIssues(id);
  }

  @Patch('bulk-update')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Bulk update issues' })
  @ApiResponse({ status: 200, description: 'Issues successfully updated' })
  bulkUpdate(
    @Body('issueIds') issueIds: string[],
    @Body('updateData') updateData: Partial<UpdateIssueDto>,
  ) {
    return this.issuesService.bulkUpdate(issueIds, updateData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get issue by ID' })
  @ApiResponse({ status: 200, description: 'Issue information' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update issue' })
  @ApiResponse({ status: 200, description: 'Issue successfully updated' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  update(@Param('id') id: string, @Body() updateIssueDto: UpdateIssueDto, @CurrentUser() user) {
    return this.issuesService.update(id, updateIssueDto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Delete issue' })
  @ApiResponse({ status: 200, description: 'Issue successfully deleted' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.issuesService.remove(id, user._id);
  }

  @Post(':id/time-logs')
  @ApiOperation({ summary: 'Add time log to issue' })
  @ApiResponse({ status: 200, description: 'Time log added successfully' })
  addTimeLog(
    @Param('id') id: string,
    @Body() addTimeLogDto: AddTimeLogDto,
    @CurrentUser() user,
  ) {
    return this.issuesService.addTimeLog(id, user._id, addTimeLogDto);
  }

  @Post(':id/watchers')
  @ApiOperation({ summary: 'Add watcher to issue' })
  @ApiResponse({ status: 200, description: 'Watcher added successfully' })
  addWatcher(@Param('id') id: string, @CurrentUser() user) {
    return this.issuesService.addWatcher(id, user._id);
  }

  @Delete(':id/watchers')
  @ApiOperation({ summary: 'Remove watcher from issue' })
  @ApiResponse({ status: 200, description: 'Watcher removed successfully' })
  removeWatcher(@Param('id') id: string, @CurrentUser() user) {
    return this.issuesService.removeWatcher(id, user._id);
  }

  @Post(':id/blockers/:blockerIssueId')
  @ApiOperation({ summary: 'Add blocker to issue' })
  @ApiResponse({ status: 200, description: 'Blocker added successfully' })
  addBlocker(
    @Param('id') id: string,
    @Param('blockerIssueId') blockerIssueId: string,
  ) {
    return this.issuesService.addBlocker(id, blockerIssueId);
  }

  @Delete(':id/blockers/:blockerIssueId')
  @ApiOperation({ summary: 'Remove blocker from issue' })
  @ApiResponse({ status: 200, description: 'Blocker removed successfully' })
  removeBlocker(
    @Param('id') id: string,
    @Param('blockerIssueId') blockerIssueId: string,
  ) {
    return this.issuesService.removeBlocker(id, blockerIssueId);
  }

  @Patch(':id/order')
  @ApiOperation({ summary: 'Update issue order (for Kanban)' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  updateOrder(@Param('id') id: string, @Body('order') order: number) {
    return this.issuesService.updateOrder(id, order);
  }

  @Patch(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Archive an issue (Admin/PM only)' })
  @ApiResponse({ status: 200, description: 'Issue archived successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin/PM only' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  archive(@Param('id') id: string, @CurrentUser() user) {
    return this.issuesService.archive(id, user._id);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Restore an archived issue (Admin/PM only)' })
  @ApiResponse({ status: 200, description: 'Issue restored successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin/PM only' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  restore(@Param('id') id: string, @CurrentUser() user) {
    return this.issuesService.restore(id, user._id);
  }
}
