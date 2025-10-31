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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, UpdateFeedbackDto, QueryFeedbackDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Create new feedback' })
  @ApiResponse({ status: 201, description: 'Feedback successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createFeedbackDto: CreateFeedbackDto, @CurrentUser() user) {
    return this.feedbackService.create(createFeedbackDto, user._id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all feedback' })
  @ApiResponse({ status: 200, description: 'List of all feedback' })
  findAll(@Query() query: QueryFeedbackDto) {
    return this.feedbackService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get feedback statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedback statistics' })
  getStats() {
    return this.feedbackService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiResponse({ status: 200, description: 'Feedback details' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback (owner only)' })
  @ApiResponse({ status: 200, description: 'Feedback successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  update(
    @Param('id') id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
    @CurrentUser() user,
  ) {
    return this.feedbackService.update(id, updateFeedbackDto, user._id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete feedback (owner only)' })
  @ApiResponse({ status: 200, description: 'Feedback successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.remove(id, user._id);
  }

  @Post(':id/upvote')
  @ApiOperation({ summary: 'Toggle upvote on feedback' })
  @ApiResponse({ status: 200, description: 'Upvote toggled successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  toggleUpvote(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.toggleUpvote(id, user._id);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark feedback as resolved (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedback marked as resolved' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  resolve(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.resolve(id, user._id);
  }

  @Patch(':id/reopen')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reopen resolved feedback (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedback reopened' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  reopen(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.reopen(id, user._id);
  }
}
