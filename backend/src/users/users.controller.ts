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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateNotificationPreferencesDto, UpdateTodoQueueDto, AddToQueueDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: any = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    return this.usersService.findAll(filters, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Query('q') query: string) {
    return this.usersService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User information' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar successfully uploaded' })
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.usersService.uploadAvatar(id, file);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (Admin only) - Soft delete' })
  @ApiResponse({ status: 200, description: 'User successfully deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    // Soft delete - deactivate user instead of hard delete
    // This preserves data integrity for tickets, comments, etc.
    return this.usersService.deactivate(id);
  }

  @Get(':id/notification-preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getNotificationPreferences(@Param('id') id: string) {
    return this.usersService.getNotificationPreferences(id);
  }

  @Patch(':id/notification-preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences successfully updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateNotificationPreferences(
    @Param('id') id: string,
    @Body() updatePreferencesDto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(id, updatePreferencesDto as any);
  }

  // ==================== TODO QUEUE ENDPOINTS ====================

  @Get(':id/todo-queue')
  @ApiOperation({ summary: 'Get user todo queue' })
  @ApiResponse({ status: 200, description: 'Todo queue retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getTodoQueue(@Param('id') id: string) {
    return this.usersService.getTodoQueue(id);
  }

  @Get(':id/todo-queue/available')
  @ApiOperation({ summary: 'Get issues available to add to queue' })
  @ApiResponse({ status: 200, description: 'Available issues retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getAvailableForQueue(@Param('id') id: string) {
    return this.usersService.getAvailableForQueue(id);
  }

  @Patch(':id/todo-queue')
  @ApiOperation({ summary: 'Update todo queue order' })
  @ApiResponse({ status: 200, description: 'Queue order updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateTodoQueue(
    @Param('id') id: string,
    @Body() updateDto: UpdateTodoQueueDto,
  ) {
    return this.usersService.updateTodoQueue(id, updateDto.issueIds);
  }

  @Post(':id/todo-queue/add/:issueId')
  @ApiOperation({ summary: 'Add issue to todo queue' })
  @ApiResponse({ status: 201, description: 'Issue added to queue' })
  @ApiResponse({ status: 400, description: 'Issue not found or not assigned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  addToQueue(
    @Param('id') id: string,
    @Param('issueId') issueId: string,
    @Body() addDto: AddToQueueDto,
  ) {
    return this.usersService.addToQueue(id, issueId, addDto.position);
  }

  @Delete(':id/todo-queue/remove/:issueId')
  @ApiOperation({ summary: 'Remove issue from todo queue' })
  @ApiResponse({ status: 200, description: 'Issue removed from queue' })
  @ApiResponse({ status: 404, description: 'User not found' })
  removeFromQueue(
    @Param('id') id: string,
    @Param('issueId') issueId: string,
  ) {
    return this.usersService.removeFromQueue(id, issueId);
  }
}
