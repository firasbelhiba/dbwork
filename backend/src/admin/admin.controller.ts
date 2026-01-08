import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService, TimerSettings, CreateProjectRoleDto, UpdateProjectRoleDto, CreateTicketCategoryDto, UpdateTicketCategoryDto } from './admin.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';
import { ProjectRoleDefinition, TicketCategoryDefinition } from './schemas/app-settings.schema';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('export/database')
  @ApiOperation({ summary: 'Export entire database as JSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database exported successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async exportDatabase(@Res() res: Response, @CurrentUser() user) {
    const exportData = await this.adminService.exportDatabase();

    const filename = `dbwork-export-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(exportData, null, 2));
  }

  @Get('export/database/download')
  @ApiOperation({ summary: 'Download entire database as JSON file (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database file downloaded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async downloadDatabase(@Res() res: Response, @CurrentUser() user) {
    const exportData = await this.adminService.exportDatabase();

    const filename = `dbwork-full-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(exportData, null, 2));
  }

  @Get('export/collection/:name')
  @ApiOperation({ summary: 'Export specific collection as JSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'Collection exported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid collection name' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async exportCollection(
    @Param('name') collectionName: string,
    @Res() res: Response,
    @CurrentUser() user,
  ) {
    const validCollections = this.adminService.getExportableCollections();

    if (!validCollections.includes(collectionName)) {
      throw new BadRequestException(
        `Invalid collection name. Available collections: ${validCollections.join(', ')}`,
      );
    }

    const exportData = await this.adminService.exportCollection(collectionName);

    const filename = `dbwork-${collectionName}-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(exportData, null, 2));
  }

  @Get('export/collections')
  @ApiOperation({ summary: 'Get list of exportable collections (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of available collections' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  getExportableCollections() {
    return {
      collections: this.adminService.getExportableCollections(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get database statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Database statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getDatabaseStats() {
    return this.adminService.getDatabaseStats();
  }

  @Get('settings/timer')
  @ApiOperation({ summary: 'Get timer auto-stop settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Timer settings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getTimerSettings(): Promise<TimerSettings> {
    return this.adminService.getTimerSettings();
  }

  @Put('settings/timer')
  @ApiOperation({ summary: 'Update timer auto-stop settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Timer settings updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid settings values' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateTimerSettings(
    @Body() updates: Partial<TimerSettings>,
  ): Promise<TimerSettings> {
    try {
      return await this.adminService.updateTimerSettings(updates);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // =====================
  // Project Roles Management
  // =====================

  @Get('settings/project-roles')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all project roles' })
  @ApiResponse({ status: 200, description: 'Project roles retrieved successfully' })
  async getProjectRoles(): Promise<ProjectRoleDefinition[]> {
    return this.adminService.getProjectRoles();
  }

  @Post('settings/project-roles')
  @ApiOperation({ summary: 'Create a new project role (Admin only)' })
  @ApiResponse({ status: 201, description: 'Project role created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createProjectRole(
    @Body() dto: CreateProjectRoleDto,
  ): Promise<ProjectRoleDefinition[]> {
    return this.adminService.createProjectRole(dto);
  }

  @Put('settings/project-roles/:roleId')
  @ApiOperation({ summary: 'Update a project role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Project role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role data' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateProjectRole(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateProjectRoleDto,
  ): Promise<ProjectRoleDefinition[]> {
    return this.adminService.updateProjectRole(roleId, dto);
  }

  @Delete('settings/project-roles/:roleId')
  @ApiOperation({ summary: 'Delete a project role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Project role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteProjectRole(
    @Param('roleId') roleId: string,
  ): Promise<ProjectRoleDefinition[]> {
    return this.adminService.deleteProjectRole(roleId);
  }

  @Post('settings/project-roles/reorder')
  @ApiOperation({ summary: 'Reorder project roles (Admin only)' })
  @ApiResponse({ status: 200, description: 'Project roles reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async reorderProjectRoles(
    @Body() body: { roleIds: string[] },
  ): Promise<ProjectRoleDefinition[]> {
    return this.adminService.reorderProjectRoles(body.roleIds);
  }

  // =====================
  // Ticket Categories Management
  // =====================

  @Get('settings/ticket-categories')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all ticket categories' })
  @ApiResponse({ status: 200, description: 'Ticket categories retrieved successfully' })
  async getTicketCategories(): Promise<TicketCategoryDefinition[]> {
    return this.adminService.getTicketCategories();
  }

  @Post('settings/ticket-categories')
  @ApiOperation({ summary: 'Create a new ticket category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Ticket category created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createTicketCategory(
    @Body() dto: CreateTicketCategoryDto,
  ): Promise<TicketCategoryDefinition[]> {
    return this.adminService.createTicketCategory(dto);
  }

  @Put('settings/ticket-categories/:categoryId')
  @ApiOperation({ summary: 'Update a ticket category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Ticket category updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category data' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateTicketCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateTicketCategoryDto,
  ): Promise<TicketCategoryDefinition[]> {
    return this.adminService.updateTicketCategory(categoryId, dto);
  }

  @Delete('settings/ticket-categories/:categoryId')
  @ApiOperation({ summary: 'Delete a ticket category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Ticket category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default categories' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteTicketCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<TicketCategoryDefinition[]> {
    return this.adminService.deleteTicketCategory(categoryId);
  }

  @Post('settings/ticket-categories/reorder')
  @ApiOperation({ summary: 'Reorder ticket categories (Admin only)' })
  @ApiResponse({ status: 200, description: 'Ticket categories reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async reorderTicketCategories(
    @Body() body: { categoryIds: string[] },
  ): Promise<TicketCategoryDefinition[]> {
    return this.adminService.reorderTicketCategories(body.categoryIds);
  }
}
