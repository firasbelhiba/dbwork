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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, UpdateFeedbackDto, QueryFeedbackDto } from './dto';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';
import { UpdateFeedbackCommentDto } from './dto/update-feedback-comment.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles, CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

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

  @Patch(':id/in-progress')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark feedback as in progress (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedback marked as in progress' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  inProgress(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.inProgress(id, user._id);
  }

  @Patch(':id/to-test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark feedback as to test (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedback marked as to test' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  toTest(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.toTest(id, user._id);
  }

  @Patch(':id/close')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Close feedback (Admin only)' })
  @ApiResponse({ status: 200, description: 'Feedback closed' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  close(@Param('id') id: string, @CurrentUser() user) {
    return this.feedbackService.close(id, user._id);
  }

  @Post('upload-image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image for feedback' })
  @ApiResponse({ status: 201, description: 'Image successfully uploaded' })
  @UseInterceptors(
    FileInterceptor('image', {
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
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.feedbackService.uploadImage(file);
  }

  // Comment routes
  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to feedback' })
  @ApiResponse({ status: 201, description: 'Comment successfully created' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  createComment(
    @Param('id') feedbackId: string,
    @CurrentUser() user,
    @Body() createCommentDto: CreateFeedbackCommentDto,
  ) {
    return this.feedbackService.createComment(feedbackId, user._id, createCommentDto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get all comments for a feedback' })
  @ApiResponse({ status: 200, description: 'Returns all comments' })
  getComments(@Param('id') feedbackId: string) {
    return this.feedbackService.getCommentsByFeedback(feedbackId);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only edit own comments' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user,
    @Body() updateCommentDto: UpdateFeedbackCommentDto,
  ) {
    return this.feedbackService.updateComment(commentId, user._id, updateCommentDto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own comments or admin' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.feedbackService.deleteComment(commentId, user._id, isAdmin);
  }

  @Post('comments/:commentId/reactions')
  @ApiOperation({ summary: 'Add reaction to feedback comment' })
  @ApiResponse({ status: 200, description: 'Reaction added' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  addCommentReaction(
    @Param('commentId') commentId: string,
    @Body('reaction') reaction: string,
    @CurrentUser() user,
  ) {
    return this.feedbackService.addCommentReaction(commentId, user._id, reaction);
  }

  @Delete('comments/:commentId/reactions')
  @ApiOperation({ summary: 'Remove reaction from feedback comment' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  removeCommentReaction(@Param('commentId') commentId: string, @CurrentUser() user) {
    return this.feedbackService.removeCommentReaction(commentId, user._id);
  }
}
