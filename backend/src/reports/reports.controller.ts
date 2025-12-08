import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project/:projectId/progress')
  @ApiOperation({ summary: 'Get project progress report' })
  @ApiResponse({ status: 200, description: 'Project progress data' })
  getProjectProgress(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectProgress(projectId);
  }

  @Get('team/performance')
  @ApiOperation({ summary: 'Get team performance report' })
  @ApiResponse({ status: 200, description: 'Team performance data' })
  getTeamPerformance(@Query('projectId') projectId?: string) {
    return this.reportsService.getTeamPerformance(projectId);
  }

  @Get('issues/statistics')
  @ApiOperation({ summary: 'Get issue statistics' })
  @ApiResponse({ status: 200, description: 'Issue statistics' })
  getIssueStatistics(@Query('projectId') projectId?: string) {
    return this.reportsService.getIssueStatistics(projectId);
  }

  @Get('sprint/:sprintId/burndown')
  @ApiOperation({ summary: 'Get sprint burndown chart data' })
  @ApiResponse({ status: 200, description: 'Burndown data' })
  getSprintBurndown(@Param('sprintId') sprintId: string) {
    return this.reportsService.getSprintBurndown(sprintId);
  }

  @Get('project/:projectId/velocity')
  @ApiOperation({ summary: 'Get velocity trend' })
  @ApiResponse({ status: 200, description: 'Velocity trend data' })
  getVelocityTrend(
    @Param('projectId') projectId: string,
    @Query('sprintCount') sprintCount?: number,
  ) {
    return this.reportsService.getVelocityTrend(projectId, sprintCount);
  }

  @Get('time-tracking')
  @ApiOperation({ summary: 'Get time tracking report' })
  @ApiResponse({ status: 200, description: 'Time tracking data' })
  getTimeTracking(@Query('projectId') projectId?: string) {
    return this.reportsService.getTimeTracking(projectId);
  }

  @Get('project/:projectId/status-distribution')
  @ApiOperation({ summary: 'Get status distribution for project' })
  @ApiResponse({ status: 200, description: 'Status distribution data' })
  getStatusDistribution(@Param('projectId') projectId: string) {
    return this.reportsService.getStatusDistribution(projectId);
  }

  @Get('project/:projectId/team-workload')
  @ApiOperation({ summary: 'Get team workload breakdown' })
  @ApiResponse({ status: 200, description: 'Team workload data' })
  getTeamWorkloadBreakdown(@Param('projectId') projectId: string) {
    return this.reportsService.getTeamWorkloadBreakdown(projectId);
  }

  @Get('project/:projectId/issue-creation-trend')
  @ApiOperation({ summary: 'Get issue creation trend' })
  @ApiResponse({ status: 200, description: 'Issue creation trend data' })
  getIssueCreationTrend(
    @Param('projectId') projectId: string,
    @Query('days') days?: number,
  ) {
    return this.reportsService.getIssueCreationTrend(projectId, days);
  }

  @Get('my-created-tasks-stats')
  @ApiOperation({ summary: 'Get statistics for tasks created by the current user' })
  @ApiResponse({ status: 200, description: 'My created tasks statistics' })
  getMyCreatedTasksStats(
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    return this.reportsService.getMyCreatedTasksStats(req.user._id, days);
  }

  // ============================================
  // NEW ADMIN REPORTS
  // ============================================

  @Get('time-attendance')
  @ApiOperation({ summary: 'Get time attendance report for all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Time attendance data with daily hours, extra hours, and alerts' })
  getTimeAttendanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTimeAttendanceReport(startDate, endDate);
  }

  @Get('team-productivity')
  @ApiOperation({ summary: 'Get team productivity report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Team productivity data with issues completed, time logged, leaderboard' })
  getTeamProductivityReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTeamProductivityReport(startDate, endDate);
  }

  @Get('user/:userId/detail')
  @ApiOperation({ summary: 'Get detailed report for a single user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User detail data with time by project, daily activity, issues worked on' })
  getUserDetailReport(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getUserDetailReport(userId, startDate, endDate);
  }

  @Get('project/:projectId/time-analysis')
  @ApiOperation({ summary: 'Get project time analysis (Admin only)' })
  @ApiResponse({ status: 200, description: 'Project time analysis with team breakdown, lifecycle, bottlenecks' })
  getProjectTimeAnalysis(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectTimeAnalysis(projectId);
  }
}
