import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
}
