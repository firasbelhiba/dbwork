import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('issue/:issueId')
  @ApiOperation({ summary: 'Create a comment on an issue' })
  @ApiResponse({ status: 201, description: 'Comment successfully created' })
  create(
    @Param('issueId') issueId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user,
  ) {
    return this.commentsService.create(issueId, user._id, createCommentDto);
  }

  @Get('issue/:issueId')
  @ApiOperation({ summary: 'Get all comments for an issue' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  findByIssue(@Param('issueId') issueId: string) {
    return this.commentsService.findByIssue(issueId);
  }

  @Get('issue/:issueId/count')
  @ApiOperation({ summary: 'Get comment count for an issue' })
  @ApiResponse({ status: 200, description: 'Comment count' })
  getCommentCount(@Param('issueId') issueId: string) {
    return this.commentsService.getCommentCount(issueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment information' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get replies to a comment' })
  @ApiResponse({ status: 200, description: 'List of replies' })
  getReplies(@Param('id') id: string) {
    return this.commentsService.getReplies(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user,
  ) {
    return this.commentsService.update(id, user._id, updateCommentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    const isAdmin = user.role === 'admin';
    return this.commentsService.remove(id, user._id, isAdmin);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add reaction to comment' })
  @ApiResponse({ status: 200, description: 'Reaction added' })
  addReaction(
    @Param('id') id: string,
    @Body('reaction') reaction: string,
    @CurrentUser() user,
  ) {
    return this.commentsService.addReaction(id, user._id, reaction);
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove reaction from comment' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  removeReaction(@Param('id') id: string, @CurrentUser() user) {
    return this.commentsService.removeReaction(id, user._id);
  }
}
