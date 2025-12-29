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
import { SprintsService } from './sprints.service';
import { CreateSprintDto, UpdateSprintDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Create a new sprint' })
  @ApiResponse({ status: 201, description: 'Sprint successfully created' })
  create(@Body() createSprintDto: CreateSprintDto, @CurrentUser() user) {
    return this.sprintsService.create(createSprintDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sprints' })
  @ApiResponse({ status: 200, description: 'List of sprints' })
  findAll(@Query('projectId') projectId?: string, @Query('status') status?: string) {
    return this.sprintsService.findAll(projectId, status);
  }

  @Get('project/:projectId/active')
  @ApiOperation({ summary: 'Get active sprint for project' })
  @ApiResponse({ status: 200, description: 'Active sprint' })
  getActiveSprint(@Param('projectId') projectId: string) {
    return this.sprintsService.getActiveSprint(projectId);
  }

  @Get('project/:projectId/velocity')
  @ApiOperation({ summary: 'Get project velocity (last 5 sprints)' })
  @ApiResponse({ status: 200, description: 'Velocity data' })
  getProjectVelocity(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number,
  ) {
    return this.sprintsService.getProjectVelocity(projectId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sprint by ID' })
  @ApiResponse({ status: 200, description: 'Sprint information' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id);
  }

  @Get(':id/velocity')
  @ApiOperation({ summary: 'Calculate sprint velocity' })
  @ApiResponse({ status: 200, description: 'Velocity data' })
  calculateVelocity(@Param('id') id: string) {
    return this.sprintsService.calculateVelocity(id);
  }

  @Get(':id/burndown')
  @ApiOperation({ summary: 'Get burndown chart data' })
  @ApiResponse({ status: 200, description: 'Burndown data' })
  getBurndownData(@Param('id') id: string) {
    return this.sprintsService.getBurndownData(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Update sprint' })
  @ApiResponse({ status: 200, description: 'Sprint successfully updated' })
  update(@Param('id') id: string, @Body() updateSprintDto: UpdateSprintDto) {
    return this.sprintsService.update(id, updateSprintDto);
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Start a sprint' })
  @ApiResponse({ status: 200, description: 'Sprint successfully started' })
  start(@Param('id') id: string, @CurrentUser() user) {
    return this.sprintsService.start(id, user._id);
  }

  @Post(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Complete a sprint' })
  @ApiResponse({ status: 200, description: 'Sprint successfully completed' })
  complete(@Param('id') id: string, @CurrentUser() user) {
    return this.sprintsService.complete(id, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Delete sprint' })
  @ApiResponse({ status: 200, description: 'Sprint successfully deleted' })
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }

  @Post(':id/issues/:issueId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Add issue to sprint' })
  @ApiResponse({ status: 200, description: 'Issue added to sprint' })
  addIssue(@Param('id') id: string, @Param('issueId') issueId: string) {
    return this.sprintsService.addIssue(id, issueId);
  }

  @Delete(':id/issues/:issueId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Remove issue from sprint' })
  @ApiResponse({ status: 200, description: 'Issue removed from sprint' })
  removeIssue(@Param('id') id: string, @Param('issueId') issueId: string) {
    return this.sprintsService.removeIssue(id, issueId);
  }
}
