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
import { TimeTrackingService } from './time-tracking.service';
import { CreateIssueDto, UpdateIssueDto, FilterIssuesDto, AddTimeLogDto, StopTimerDto, AddManualTimeDto, UpdateTimeEntryDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('issues')
export class IssuesController {
  constructor(
    private readonly issuesService: IssuesService,
    private readonly timeTrackingService: TimeTrackingService,
  ) {}

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

  @Get('user/:userId/workload')
  @ApiOperation({ summary: 'Get user workload (in-progress issues by project)' })
  @ApiResponse({ status: 200, description: 'User workload data' })
  getUserWorkload(@Param('userId') userId: string) {
    return this.issuesService.getUserWorkload(userId);
  }

  @Get('user/:userId/bandwidth')
  @ApiOperation({ summary: 'Get user bandwidth (hours worked and remaining capacity)' })
  @ApiResponse({ status: 200, description: 'User bandwidth data including projects and time worked' })
  getUserBandwidth(@Param('userId') userId: string) {
    return this.issuesService.getUserBandwidth(userId);
  }

  @Get('user/:userId/calendar')
  @ApiOperation({ summary: 'Get user tickets for calendar view (by start/due date)' })
  @ApiResponse({ status: 200, description: 'User tickets grouped by date for calendar display' })
  getUserCalendar(
    @Param('userId') userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.issuesService.getUserCalendarTickets(
      userId,
      parseInt(year),
      parseInt(month),
    );
  }

  @Get('user/:userId/category-stats')
  @ApiOperation({ summary: 'Get user category distribution for completed issues' })
  @ApiResponse({ status: 200, description: 'User category stats for profile chart' })
  getUserCategoryStats(@Param('userId') userId: string) {
    return this.issuesService.getUserCategoryStats(userId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get issues by project' })
  @ApiResponse({ status: 200, description: 'Project issues' })
  getByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('isArchived') isArchived?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('categories') categories?: string | string[],
    @CurrentUser() user?,
  ) {
    // Handle categories parameter (can be string or array)
    const categoriesArray = categories
      ? (Array.isArray(categories) ? categories : [categories])
      : undefined;
    return this.issuesService.getIssuesByProject(projectId, status, isArchived, assignedTo, user?._id, categoriesArray, user?.role);
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
    @Query('categories') categories?: string | string[],
    @CurrentUser() user?,
  ) {
    // Handle categories parameter (can be string or array)
    const categoriesArray = categories
      ? (Array.isArray(categories) ? categories : [categories])
      : undefined;
    return this.issuesService.getIssuesBySprint(sprintId, isArchived, assignedTo, user?._id, categoriesArray, user?.role);
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
  getSubIssues(@Param('id') id: string, @Query('includeArchived') includeArchived?: string) {
    return this.issuesService.getSubIssues(id, includeArchived);
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

  // ==================== TIME TRACKING ENDPOINTS ====================

  @Post(':id/timer/start')
  @ApiOperation({ summary: 'Start time tracking for an issue' })
  @ApiResponse({ status: 200, description: 'Timer started successfully' })
  @ApiResponse({ status: 400, description: 'Timer already running' })
  startTimer(@Param('id') id: string, @CurrentUser() user) {
    return this.timeTrackingService.startTimer(id, user._id);
  }

  @Post(':id/timer/pause')
  @ApiOperation({ summary: 'Pause time tracking for an issue' })
  @ApiResponse({ status: 200, description: 'Timer paused successfully' })
  @ApiResponse({ status: 400, description: 'Timer not running or already paused' })
  pauseTimer(@Param('id') id: string, @CurrentUser() user) {
    return this.timeTrackingService.pauseTimer(id, user._id);
  }

  @Post(':id/timer/resume')
  @ApiOperation({ summary: 'Resume time tracking for an issue' })
  @ApiResponse({ status: 200, description: 'Timer resumed successfully' })
  @ApiResponse({ status: 400, description: 'Timer not paused' })
  resumeTimer(@Param('id') id: string, @CurrentUser() user) {
    return this.timeTrackingService.resumeTimer(id, user._id);
  }

  @Get(':id/timer/status')
  @ApiOperation({ summary: 'Get timer status for an issue' })
  @ApiResponse({ status: 200, description: 'Timer status' })
  getTimerStatus(@Param('id') id: string, @CurrentUser() user) {
    return this.timeTrackingService.getTimerStatus(id, user._id);
  }

  @Post(':id/time-entries')
  @ApiOperation({ summary: 'Add manual time entry to an issue' })
  @ApiResponse({ status: 200, description: 'Time entry added successfully' })
  addManualTimeEntry(
    @Param('id') id: string,
    @Body() addManualTimeDto: AddManualTimeDto,
    @CurrentUser() user,
  ) {
    return this.timeTrackingService.addManualTimeEntry(
      id,
      user._id,
      addManualTimeDto.duration,
      addManualTimeDto.description,
    );
  }

  @Patch(':id/time-entries/:entryId')
  @ApiOperation({ summary: 'Update a time entry' })
  @ApiResponse({ status: 200, description: 'Time entry updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this entry' })
  updateTimeEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() updateTimeEntryDto: UpdateTimeEntryDto,
    @CurrentUser() user,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.timeTrackingService.updateTimeEntry(
      id,
      entryId,
      user._id,
      isAdmin,
      updateTimeEntryDto.duration,
      updateTimeEntryDto.description,
    );
  }

  @Delete(':id/time-entries/:entryId')
  @ApiOperation({ summary: 'Delete a time entry' })
  @ApiResponse({ status: 200, description: 'Time entry deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this entry' })
  deleteTimeEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.timeTrackingService.deleteTimeEntry(id, entryId, user._id, isAdmin);
  }

  @Get(':id/time/aggregated')
  @ApiOperation({ summary: 'Get aggregated time for an issue (including sub-issues)' })
  @ApiResponse({ status: 200, description: 'Aggregated time data' })
  getAggregatedTime(@Param('id') id: string) {
    return this.timeTrackingService.getAggregatedTime(id);
  }

  @Post(':id/timer/activity')
  @ApiOperation({ summary: 'Update last activity timestamp for timer' })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  updateActivity(@Param('id') id: string, @CurrentUser() user) {
    return this.timeTrackingService.updateActivity(id, user._id);
  }
}
