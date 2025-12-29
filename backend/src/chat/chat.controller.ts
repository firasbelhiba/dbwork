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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators';
import { UserRole } from '@common/enums';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== CONVERSATIONS ====================

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  getConversations(@CurrentUser() user) {
    return this.chatService.getConversationsForUser(user._id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  getConversation(@Param('id') id: string, @CurrentUser() user) {
    return this.chatService.getConversationById(id, user._id);
  }

  @Post('conversations/dm/:userId')
  @ApiOperation({ summary: 'Create or get direct message conversation with a user' })
  @ApiResponse({ status: 200, description: 'DM conversation' })
  @ApiResponse({ status: 201, description: 'DM conversation created' })
  createOrGetDM(@Param('userId') userId: string, @CurrentUser() user) {
    return this.chatService.findOrCreateDM(user._id, userId);
  }

  @Get('conversations/project/:projectId')
  @ApiOperation({ summary: 'Get project group conversation' })
  @ApiResponse({ status: 200, description: 'Project conversation' })
  @ApiResponse({ status: 404, description: 'Project conversation not found' })
  getProjectConversation(@Param('projectId') projectId: string, @CurrentUser() user) {
    return this.chatService.getProjectConversation(projectId, user._id);
  }

  // ==================== MESSAGES ====================

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Paginated messages' })
  getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: QueryMessagesDto,
    @CurrentUser() user,
  ) {
    return this.chatService.getMessages(conversationId, user._id, query);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user,
  ) {
    return this.chatService.createMessage(conversationId, user._id, dto);
  }

  @Post('conversations/:conversationId/messages/with-attachments')
  @ApiOperation({ summary: 'Send a message with file attachments' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        replyTo: { type: 'string' },
        mentions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        // Allow images and common document types
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  async sendMessageWithAttachments(
    @Param('conversationId') conversationId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @CurrentUser() user,
  ) {
    // Upload all files
    const attachments = await Promise.all(
      (files || []).map(file => this.chatService.uploadAttachment(file)),
    );

    const dto: CreateMessageDto = {
      content: body.content || '',
      replyTo: body.replyTo,
      mentions: body.mentions ? JSON.parse(body.mentions) : [],
    };

    return this.chatService.createMessage(conversationId, user._id, dto, attachments);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message updated' })
  @ApiResponse({ status: 403, description: 'Can only edit own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  updateMessage(
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user,
  ) {
    return this.chatService.updateMessage(messageId, user._id, dto);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Can only delete own messages (unless admin)' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  deleteMessage(@Param('messageId') messageId: string, @CurrentUser() user) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.chatService.deleteMessage(messageId, user._id, isAdmin);
  }

  // ==================== READ RECEIPTS ====================

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  markAsRead(@Param('conversationId') conversationId: string, @CurrentUser() user) {
    return this.chatService.markConversationAsRead(conversationId, user._id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser() user) {
    const count = await this.chatService.getUnreadCount(user._id);
    return { count };
  }

  // ==================== FILE UPLOADS ====================

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @CurrentUser() user) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.chatService.uploadAttachment(file);
  }

  // ==================== REACTIONS ====================

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add reaction to a message' })
  @ApiResponse({ status: 200, description: 'Reaction added' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  addReaction(
    @Param('messageId') messageId: string,
    @Body('reaction') reaction: string,
    @CurrentUser() user,
  ) {
    return this.chatService.addReaction(messageId, user._id, reaction);
  }

  @Delete('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Remove reaction from a message' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  removeReaction(@Param('messageId') messageId: string, @CurrentUser() user) {
    return this.chatService.removeReaction(messageId, user._id);
  }

  // ==================== SEARCH ====================

  @Get('search')
  @ApiOperation({ summary: 'Search messages across all conversations' })
  @ApiResponse({ status: 200, description: 'Search results' })
  searchMessages(@Query('q') query: string, @CurrentUser() user) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }
    return this.chatService.searchMessages(user._id, query.trim());
  }
}
