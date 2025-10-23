import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class AppWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.userEmail = payload.email;

      // Store connection
      this.connectedUsers.set(payload.sub, client.id);

      console.log(`Client connected: ${client.id} (User: ${payload.email})`);

      // Notify user connection
      client.emit('connected', { userId: payload.sub });

      // Join user's personal room
      client.join(`user:${payload.sub}`);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      console.log(`Client disconnected: ${client.id} (User: ${client.userId})`);
    }
  }

  @SubscribeMessage('join:project')
  handleJoinProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() projectId: string,
  ) {
    client.join(`project:${projectId}`);
    console.log(`User ${client.userId} joined project:${projectId}`);
    return { event: 'joined:project', data: { projectId } };
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() projectId: string,
  ) {
    client.leave(`project:${projectId}`);
    console.log(`User ${client.userId} left project:${projectId}`);
    return { event: 'left:project', data: { projectId } };
  }

  @SubscribeMessage('join:sprint')
  handleJoinSprint(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() sprintId: string,
  ) {
    client.join(`sprint:${sprintId}`);
    console.log(`User ${client.userId} joined sprint:${sprintId}`);
    return { event: 'joined:sprint', data: { sprintId } };
  }

  @SubscribeMessage('leave:sprint')
  handleLeaveSprint(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() sprintId: string,
  ) {
    client.leave(`sprint:${sprintId}`);
    console.log(`User ${client.userId} left sprint:${sprintId}`);
    return { event: 'left:sprint', data: { sprintId } };
  }

  @SubscribeMessage('join:issue')
  handleJoinIssue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() issueId: string,
  ) {
    client.join(`issue:${issueId}`);
    console.log(`User ${client.userId} joined issue:${issueId}`);
    return { event: 'joined:issue', data: { issueId } };
  }

  @SubscribeMessage('leave:issue')
  handleLeaveIssue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() issueId: string,
  ) {
    client.leave(`issue:${issueId}`);
    console.log(`User ${client.userId} left issue:${issueId}`);
    return { event: 'left:issue', data: { issueId } };
  }

  // Emit methods to be called from services

  emitIssueCreated(projectId: string, issue: any) {
    this.server.to(`project:${projectId}`).emit('issue:created', issue);
  }

  emitIssueUpdated(issueId: string, projectId: string, issue: any, changes: any) {
    this.server.to(`issue:${issueId}`).emit('issue:updated', { issue, changes });
    this.server.to(`project:${projectId}`).emit('issue:updated', { issue, changes });
  }

  emitIssueDeleted(issueId: string, projectId: string) {
    this.server.to(`issue:${issueId}`).emit('issue:deleted', { issueId });
    this.server.to(`project:${projectId}`).emit('issue:deleted', { issueId });
  }

  emitIssueStatusChanged(issueId: string, projectId: string, oldStatus: string, newStatus: string) {
    this.server.to(`issue:${issueId}`).emit('issue:status-changed', { issueId, oldStatus, newStatus });
    this.server.to(`project:${projectId}`).emit('issue:status-changed', { issueId, oldStatus, newStatus });
  }

  emitIssueAssigned(issueId: string, projectId: string, assigneeId: string, issue: any) {
    this.server.to(`issue:${issueId}`).emit('issue:assigned', { issue, assigneeId });
    this.server.to(`project:${projectId}`).emit('issue:assigned', { issue, assigneeId });
    this.server.to(`user:${assigneeId}`).emit('issue:assigned-to-you', { issue });
  }

  emitCommentAdded(issueId: string, projectId: string, comment: any) {
    this.server.to(`issue:${issueId}`).emit('comment:added', comment);
    this.server.to(`project:${projectId}`).emit('comment:added', comment);
  }

  emitCommentUpdated(issueId: string, comment: any) {
    this.server.to(`issue:${issueId}`).emit('comment:updated', comment);
  }

  emitCommentDeleted(issueId: string, commentId: string) {
    this.server.to(`issue:${issueId}`).emit('comment:deleted', { commentId });
  }

  emitSprintCreated(projectId: string, sprint: any) {
    this.server.to(`project:${projectId}`).emit('sprint:created', sprint);
  }

  emitSprintUpdated(sprintId: string, projectId: string, sprint: any) {
    this.server.to(`sprint:${sprintId}`).emit('sprint:updated', sprint);
    this.server.to(`project:${projectId}`).emit('sprint:updated', sprint);
  }

  emitSprintStarted(sprintId: string, projectId: string, sprint: any) {
    this.server.to(`sprint:${sprintId}`).emit('sprint:started', sprint);
    this.server.to(`project:${projectId}`).emit('sprint:started', sprint);
  }

  emitSprintCompleted(sprintId: string, projectId: string, sprint: any, stats: any) {
    this.server.to(`sprint:${sprintId}`).emit('sprint:completed', { sprint, stats });
    this.server.to(`project:${projectId}`).emit('sprint:completed', { sprint, stats });
  }

  emitSprintDeleted(sprintId: string, projectId: string) {
    this.server.to(`sprint:${sprintId}`).emit('sprint:deleted', { sprintId });
    this.server.to(`project:${projectId}`).emit('sprint:deleted', { sprintId });
  }

  emitProjectUpdated(projectId: string, project: any) {
    this.server.to(`project:${projectId}`).emit('project:updated', project);
  }

  emitProjectMemberAdded(projectId: string, member: any) {
    this.server.to(`project:${projectId}`).emit('project:member-added', member);
    this.server.to(`user:${member.userId}`).emit('project:added-to-project', { projectId, member });
  }

  emitProjectMemberRemoved(projectId: string, userId: string) {
    this.server.to(`project:${projectId}`).emit('project:member-removed', { userId });
    this.server.to(`user:${userId}`).emit('project:removed-from-project', { projectId });
  }

  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitUserPresence(userId: string, status: 'online' | 'offline' | 'away') {
    this.server.emit('user:presence', { userId, status });
  }

  emitUserTyping(issueId: string, userId: string, isTyping: boolean) {
    this.server.to(`issue:${issueId}`).emit('user:typing', { userId, isTyping });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get all online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Send direct message to specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
