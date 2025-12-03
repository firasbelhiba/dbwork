import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChangelogsService } from './changelogs.service';
import {
  CreateChangelogDto,
  UpdateChangelogDto,
  QueryChangelogDto,
} from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Changelogs')
@Controller('changelogs')
export class ChangelogsController {
  constructor(private readonly changelogsService: ChangelogsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new changelog (Admin only)' })
  @ApiResponse({ status: 201, description: 'Changelog successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  create(
    @Body() createChangelogDto: CreateChangelogDto,
    @CurrentUser() user,
  ) {
    return this.changelogsService.create(createChangelogDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all changelogs (Public)' })
  @ApiResponse({ status: 200, description: 'List of all changelogs' })
  findAll(@Query() query: QueryChangelogDto) {
    return this.changelogsService.findAll(query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest changelog (Public)' })
  @ApiResponse({ status: 200, description: 'Latest changelog' })
  findLatest() {
    return this.changelogsService.findLatest();
  }

  @Get('check/new')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if there is a new changelog the user has not seen' })
  @ApiResponse({ status: 200, description: 'Returns whether there is a new changelog' })
  checkForNew(@CurrentUser() user) {
    return this.changelogsService.checkForNewChangelog(user._id);
  }

  @Post('mark-seen/:version')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a changelog version as seen by the user' })
  @ApiResponse({ status: 200, description: 'Changelog marked as seen' })
  markAsSeen(@Param('version') version: string, @CurrentUser() user) {
    return this.changelogsService.markChangelogAsSeen(user._id, version);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get changelog by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Changelog details' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  findOne(@Param('id') id: string) {
    return this.changelogsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update changelog (Admin only)' })
  @ApiResponse({ status: 200, description: 'Changelog successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  update(
    @Param('id') id: string,
    @Body() updateChangelogDto: UpdateChangelogDto,
    @CurrentUser() user,
  ) {
    return this.changelogsService.update(id, updateChangelogDto, user._id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete changelog (Admin only)' })
  @ApiResponse({ status: 200, description: 'Changelog successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.changelogsService.remove(id, user._id);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish changelog and notify all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Changelog successfully published' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  publish(@Param('id') id: string, @CurrentUser() user) {
    return this.changelogsService.publish(id, user._id);
  }

  @Post(':id/unpublish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unpublish changelog (Admin only)' })
  @ApiResponse({ status: 200, description: 'Changelog successfully unpublished' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  unpublish(@Param('id') id: string, @CurrentUser() user) {
    return this.changelogsService.unpublish(id, user._id);
  }
}
