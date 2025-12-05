import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService, TimerSettings } from './admin.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

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
}
