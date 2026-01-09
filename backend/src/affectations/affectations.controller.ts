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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AffectationsService } from './affectations.service';
import {
  CreateAffectationDto,
  UpdateAffectationDto,
  QueryAffectationDto,
  ChargeabilityReportDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Affectations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('affectations')
export class AffectationsController {
  constructor(private readonly affectationsService: AffectationsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new affectation (Admin only)' })
  @ApiResponse({ status: 201, description: 'Affectation created successfully' })
  create(
    @Body() createAffectationDto: CreateAffectationDto,
    @CurrentUser() user,
  ) {
    return this.affectationsService.create(createAffectationDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all affectations with optional filters' })
  @ApiResponse({ status: 200, description: 'List of affectations' })
  findAll(@Query() query: QueryAffectationDto) {
    return this.affectationsService.findAll(query);
  }

  @Get('reports/chargeability')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Get chargeability report' })
  @ApiResponse({ status: 200, description: 'Chargeability report' })
  getChargeabilityReport(@Query() query: ChargeabilityReportDto) {
    return this.affectationsService.getChargeabilityReport(query);
  }

  @Get('reports/resource-planning')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Get resource planning report' })
  @ApiResponse({ status: 200, description: 'Resource planning report' })
  getResourcePlanningReport() {
    return this.affectationsService.getResourcePlanningReport();
  }

  @Get('reports/user-timeline/:userId')
  @ApiOperation({ summary: 'Get user timeline report' })
  @ApiResponse({ status: 200, description: 'User timeline report' })
  getUserTimelineReport(@Param('userId') userId: string) {
    return this.affectationsService.getUserTimelineReport(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get affectations for a specific user' })
  @ApiResponse({ status: 200, description: 'List of user affectations' })
  findByUser(@Param('userId') userId: string) {
    return this.affectationsService.findByUser(userId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get affectations for a specific project' })
  @ApiResponse({ status: 200, description: 'List of project affectations' })
  findByProject(@Param('projectId') projectId: string) {
    return this.affectationsService.findByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single affectation by ID' })
  @ApiResponse({ status: 200, description: 'Affectation details' })
  @ApiResponse({ status: 404, description: 'Affectation not found' })
  findOne(@Param('id') id: string) {
    return this.affectationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an affectation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Affectation updated successfully' })
  @ApiResponse({ status: 404, description: 'Affectation not found' })
  update(
    @Param('id') id: string,
    @Body() updateAffectationDto: UpdateAffectationDto,
  ) {
    return this.affectationsService.update(id, updateAffectationDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an affectation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Affectation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Affectation not found' })
  remove(@Param('id') id: string) {
    return this.affectationsService.remove(id);
  }

  @Post(':id/sync-hours')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Recalculate actual hours for an affectation' })
  @ApiResponse({ status: 200, description: 'Hours synced successfully' })
  async syncHours(@Param('id') id: string) {
    const actualHours = await this.affectationsService.calculateActualHours(id);
    return { actualHours };
  }

  @Post('sync-all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sync actual hours for all affectations (Admin only)' })
  @ApiResponse({ status: 200, description: 'All hours synced successfully' })
  syncAll() {
    return this.affectationsService.syncAllActualHours();
  }
}
