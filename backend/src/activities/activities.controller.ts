import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { QueryActivitiesDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all activities (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of activities with pagination' })
  async findAll(@Query() query: QueryActivitiesDto) {
    return this.activitiesService.findAll(query);
  }

  @Get('recent')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get recent activities (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of recent activities' })
  async findRecent() {
    return this.activitiesService.findRecent(10);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get activity statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Activity statistics' })
  async getStats() {
    return this.activitiesService.getStats();
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get activity analytics with date range (Admin only)' })
  @ApiResponse({ status: 200, description: 'Activity analytics' })
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.activitiesService.getAnalytics(startDate, endDate);
  }

  @Get('users/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users activity counts with date range (Admin only)' })
  @ApiResponse({ status: 200, description: 'All users activity data' })
  async getAllUserActivities(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.activitiesService.getAllUserActivities(startDate, endDate);
  }
}
