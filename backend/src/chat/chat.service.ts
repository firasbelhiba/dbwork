import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Conversation, ConversationDocument, ConversationType } from './schemas/conversation.schema';
import { Message, MessageDocument, MessageType, MessageAttachment } from './schemas/message.schema';
import { CreateMessageDto, UpdateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private webSocketGateway: AppWebSocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CONVERSATION METHODS ====================

  /**
   * Find or create a direct message conversation between two users
   */
  async findOrCreateDM(userId: string, otherUserId: string): Promise<ConversationDocument> {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Sort participant IDs to ensure consistent lookup
    const participants = [userId, otherUserId].sort();

    // Try to find existing DM conversation
    const existing = await this.conversationModel
      .findOne({
        type: ConversationType.DIRECT,
        participants: { $all: participants, $size: 2 },
      })
      .populate({ path: 'participants', model: 'User', select: 'firstName lastName email avatar' })
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', model: 'User', select: 'firstName lastName avatar' },
      })
      .exec();

    if (existing) {
      return existing;
    }

    // Create new DM conversation
    const conversation = new this.conversationModel({
      type: ConversationType.DIRECT,
      participants: participants.map(id => new Types.ObjectId(id)),
      readReceipts: participants.map(id => ({
        userId: new Types.ObjectId(id),
        lastReadAt: new Date(),
        unreadCount: 0,
      })),
    });

    const saved = await conversation.save();

    return this.conversationModel
      .findById(saved._id)
      .populate({ path: 'participants', model: 'User', select: 'firstName lastName email avatar' })
      .exec();
  }

  /**
   * Create a project group conversation (called when project is created)
   */
  async createProjectConversation(
    projectId: string,
    projectName: string,
    memberIds: string[],
  ): Promise<ConversationDocument> {
    // Check if conversation already exists for this project
    const existing = await this.conversationModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .exec();

    if (existing) {
      return existing;
    }

    const conversation = new this.conversationModel({
      type: ConversationType.PROJECT,
      name: projectName,
      projectId: new Types.ObjectId(projectId),
      participants: memberIds.map(id => new Types.ObjectId(id)),
      readReceipts: memberIds.map(id => ({
        userId: new Types.ObjectId(id),
        lastReadAt: new Date(),
        unreadCount: 0,
      })),
    });

    const saved = await conversation.save();

    // Create system message for conversation creation
    await this.createSystemMessage(saved._id.toString(), `Group chat created for project "${projectName}"`);

    return saved;
  }

  /**
   * Get all conversations for a user
   */
  async getConversationsForUser(userId: string): Promise<ConversationDocument[]> {
    console.log('[ChatService] getConversationsForUser called with userId:', userId);

    const conversations = await this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
        isArchived: false,
      })
      .populate({ path: 'participants', model: 'User', select: 'firstName lastName email avatar' })
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', model: 'User', select: 'firstName lastName avatar' },
      })
      .sort({ lastMessageAt: -1 })
      .exec();

    console.log('[ChatService] Found', conversations.length, 'conversations for user', userId);

    return conversations;
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(conversationId: string, userId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate({ path: 'participants', model: 'User', select: 'firstName lastName email avatar' })
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', model: 'User', select: 'firstName lastName avatar' },
      })
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    // After population, participants are User objects with _id
    // Before population or if population fails, they are ObjectIds
    const isParticipant = conversation.participants.some((p: any) => {
      const participantId = p._id ? p._id.toString() : p.toString();
      return participantId === userId;
    });

    console.log('[ChatService] Checking participant:', {
      conversationId,
      userId,
      participants: conversation.participants.map((p: any) => p._id ? p._id.toString() : p.toString()),
      isParticipant,
    });

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return conversation;
  }

  /**
   * Get project conversation by project ID
   */
  async getProjectConversation(projectId: string, userId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .populate({ path: 'participants', model: 'User', select: 'firstName lastName email avatar' })
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', model: 'User', select: 'firstName lastName avatar' },
      })
      .exec();

    if (!conversation) {
      throw new NotFoundException('Project conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return conversation;
  }

  /**
   * Add a participant to a project conversation
   */
  async addParticipantToProjectChat(projectId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .exec();

    if (!conversation) {
      return; // No conversation exists yet
    }

    // Check if already a participant
    const isParticipant = conversation.participants.some(
      p => p.toString() === userId,
    );

    if (isParticipant) {
      return;
    }

    // Add to participants and create read receipt
    conversation.participants.push(new Types.ObjectId(userId));
    conversation.readReceipts.push({
      userId: new Types.ObjectId(userId),
      lastReadAt: new Date(),
      unreadCount: 0,
    });

    await conversation.save();

    // Create system message
    await this.createSystemMessage(conversation._id.toString(), 'A new member joined the conversation');
  }

  /**
   * Remove a participant from a project conversation
   */
  async removeParticipantFromProjectChat(projectId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .exec();

    if (!conversation) {
      return;
    }

    conversation.participants = conversation.participants.filter(
      p => p.toString() !== userId,
    );

    conversation.readReceipts = conversation.readReceipts.filter(
      r => r.userId.toString() !== userId,
    );

    await conversation.save();

    // Create system message
    await this.createSystemMessage(conversation._id.toString(), 'A member left the conversation');
  }

  /**
   * Update project conversation name when project is renamed
   */
  async updateProjectConversationName(projectId: string, newName: string): Promise<void> {
    await this.conversationModel
      .updateOne(
        { projectId: new Types.ObjectId(projectId) },
        { name: newName },
      )
      .exec();
  }

  // ==================== MESSAGE METHODS ====================

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    conversationId: string,
    senderId: string,
    dto: CreateMessageDto,
    attachments: MessageAttachment[] = [],
  ): Promise<MessageDocument> {
    // Verify conversation exists and user is participant
    const conversation = await this.getConversationById(conversationId, senderId);

    // Determine message type based on attachments
    let messageType = dto.type || MessageType.TEXT;
    if (attachments.length > 0) {
      const hasImages = attachments.some(a => a.mimeType.startsWith('image/'));
      messageType = hasImages ? MessageType.IMAGE : MessageType.FILE;
    }

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      type: messageType,
      content: dto.content,
      attachments,
      mentions: dto.mentions?.map(id => new Types.ObjectId(id)) || [],
      replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : null,
    });

    const saved = await message.save();

    // Update conversation with last message
    conversation.lastMessage = saved._id as Types.ObjectId;
    conversation.lastMessageAt = saved.createdAt;

    // Increment unread count for other participants
    conversation.readReceipts.forEach(receipt => {
      if (receipt.userId.toString() !== senderId) {
        receipt.unreadCount += 1;
      }
    });

    await conversation.save();

    // Populate sender info
    const populated = await this.messageModel
      .findById(saved._id)
      .populate('senderId', 'firstName lastName email avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'firstName lastName avatar' },
      })
      .exec();

    // Emit real-time event
    this.webSocketGateway.emitChatMessage(conversationId, populated);

    // Send notifications to other participants
    const otherParticipants = conversation.participants.filter(
      (p: any) => p._id.toString() !== senderId,
    );

    for (const participant of otherParticipants) {
      const participantId = (participant as any)._id.toString();

      // Only notify if user is not in the conversation room (not viewing it)
      try {
        await this.notificationsService.create({
          userId: participantId,
          type: 'chat_message' as any,
          title: conversation.type === ConversationType.PROJECT
            ? `New message in ${conversation.name}`
            : `New message from ${(populated.senderId as any).firstName}`,
          message: dto.content.length > 100 ? dto.content.substring(0, 100) + '...' : dto.content,
          link: `/chat?conversation=${conversationId}`,
          metadata: {
            conversationId,
            senderId,
            messageId: saved._id.toString(),
          },
        });
      } catch (error) {
        console.error('[ChatService] Error sending notification:', error);
      }
    }

    return populated;
  }

  /**
   * Create a system message (for join/leave events)
   */
  private async createSystemMessage(conversationId: string, content: string): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId).exec();
    if (!conversation || conversation.participants.length === 0) {
      return;
    }

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: conversation.participants[0], // Use first participant as "sender"
      type: MessageType.SYSTEM,
      content,
    });

    const saved = await message.save();

    // Update conversation
    conversation.lastMessage = saved._id as Types.ObjectId;
    conversation.lastMessageAt = saved.createdAt;
    await conversation.save();
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    query: QueryMessagesDto,
  ): Promise<{ messages: MessageDocument[]; hasMore: boolean }> {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    const filter: any = {
      conversationId: new Types.ObjectId(conversationId),
      isDeleted: false,
    };

    // Cursor-based pagination using createdAt for reliable chronological order
    if (query.before) {
      // Get the message to find its createdAt
      const beforeMsg = await this.messageModel.findById(query.before).select('createdAt').exec();
      if (beforeMsg) {
        filter.createdAt = { $lt: beforeMsg.createdAt };
      }
    }

    const limit = query.limit || 50;

    // Always fetch in descending order (newest first), then reverse for display
    const messages = await this.messageModel
      .find(filter)
      .populate('senderId', 'firstName lastName email avatar')
      .populate('mentions', 'firstName lastName')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'firstName lastName avatar' },
      })
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    // Reverse to show oldest first (chronological order for chat display)
    result.reverse();

    // Debug: log the order of messages being returned
    console.log('[ChatService] Messages order:', result.map(m => ({
      id: m._id.toString().slice(-4),
      createdAt: m.createdAt,
      content: m.content?.substring(0, 20),
    })));

    return { messages: result, hasMore };
  }

  /**
   * Update a message
   */
  async updateMessage(
    messageId: string,
    userId: string,
    dto: UpdateMessageDto,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    message.content = dto.content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    const populated = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'firstName lastName email avatar')
      .exec();

    // Emit real-time event
    this.webSocketGateway.emitChatMessageUpdated(
      message.conversationId.toString(),
      populated,
    );

    return populated;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!isAdmin && message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message has been deleted';
    message.attachments = [];

    await message.save();

    // Emit real-time event
    this.webSocketGateway.emitChatMessageDeleted(
      message.conversationId.toString(),
      messageId,
    );
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is participant of the conversation
    await this.getConversationById(message.conversationId.toString(), userId);

    // Check if user already reacted
    const existingIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId,
    );

    if (existingIndex >= 0) {
      // Update existing reaction
      message.reactions[existingIndex].reaction = reaction;
    } else {
      // Add new reaction
      message.reactions.push({
        userId: new Types.ObjectId(userId),
        reaction,
      });
    }

    await message.save();

    const populated = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'firstName lastName email avatar')
      .exec();

    // Emit real-time event
    this.webSocketGateway.emitChatMessageUpdated(
      message.conversationId.toString(),
      populated,
    );

    return populated;
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, userId: string): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== userId,
    );

    await message.save();

    const populated = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'firstName lastName email avatar')
      .exec();

    // Emit real-time event
    this.webSocketGateway.emitChatMessageUpdated(
      message.conversationId.toString(),
      populated,
    );

    return populated;
  }

  // ==================== READ RECEIPTS ====================

  /**
   * Mark a conversation as read for a user
   */
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId).exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const receipt = conversation.readReceipts.find(
      r => r.userId.toString() === userId,
    );

    if (receipt) {
      receipt.lastReadAt = new Date();
      receipt.unreadCount = 0;
    }

    await conversation.save();

    // Emit real-time event for read receipt
    this.webSocketGateway.emitChatRead(conversationId, userId, new Date());
  }

  /**
   * Get total unread message count for a user across all conversations
   */
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
        isArchived: false,
      })
      .exec();

    let total = 0;
    for (const conv of conversations) {
      const receipt = conv.readReceipts.find(
        r => r.userId.toString() === userId,
      );
      if (receipt) {
        total += receipt.unreadCount;
      }
    }

    return total;
  }

  /**
   * Get unread count per conversation for a user
   */
  async getUnreadCountPerConversation(userId: string): Promise<Map<string, number>> {
    const conversations = await this.conversationModel
      .find({
        participants: new Types.ObjectId(userId),
        isArchived: false,
      })
      .exec();

    const counts = new Map<string, number>();
    for (const conv of conversations) {
      const receipt = conv.readReceipts.find(
        r => r.userId.toString() === userId,
      );
      if (receipt && receipt.unreadCount > 0) {
        counts.set(conv._id.toString(), receipt.unreadCount);
      }
    }

    return counts;
  }

  // ==================== FILE UPLOADS ====================

  /**
   * Upload a file attachment to Cloudinary
   */
  async uploadAttachment(file: Express.Multer.File): Promise<MessageAttachment> {
    return new Promise((resolve, reject) => {
      const isImage = file.mimetype.startsWith('image/');

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'chat-attachments',
          resource_type: isImage ? 'image' : 'auto',
          ...(isImage && {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
            ],
          }),
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              cloudinaryId: result.public_id,
              fileName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
              thumbnail: isImage ? result.secure_url : undefined,
            });
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  // ==================== SEARCH ====================

  /**
   * Search messages across all conversations user is part of
   */
  async searchMessages(userId: string, query: string): Promise<MessageDocument[]> {
    // Get all conversation IDs for user
    const conversations = await this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .select('_id')
      .exec();

    const conversationIds = conversations.map(c => c._id);

    return this.messageModel
      .find({
        conversationId: { $in: conversationIds },
        content: { $regex: query, $options: 'i' },
        isDeleted: false,
      })
      .populate('senderId', 'firstName lastName email avatar')
      .populate('conversationId', 'name type')
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }
}
