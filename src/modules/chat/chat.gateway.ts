import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UserRole } from '../users/entities/user.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  conversationId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();
  private typingUsers = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.connectedUsers.set(client.userId, client);
      
      // Join user to their personal room
      client.join(`user_${client.userId}`);
      
      // If admin, join admin room
      if (client.userRole === UserRole.ADMIN) {
        client.join('admins');
      }

      this.logger.log(`User ${client.userId} connected`);
      
      // Notify admins about user connection
      if (client.userRole === UserRole.USER) {
        this.server.to('admins').emit('userOnline', {
          userId: client.userId,
          timestamp: new Date(),
        });
      }

    } catch (error) {
      this.logger.error('Authentication failed', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      
      // Remove from typing users
      this.typingUsers.forEach((users, conversationId) => {
        users.delete(client.userId);
        if (users.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      });

      // Notify admins about user disconnection
      if (client.userRole === UserRole.USER) {
        this.server.to('admins').emit('userOffline', {
          userId: client.userId,
          timestamp: new Date(),
        });
      }

      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const conversation = await this.chatService.findConversation(data.conversationId);
      
      // Verify user has access to this conversation
      if (
        conversation.customerId !== client.userId &&
        conversation.adminId !== client.userId &&
        client.userRole !== UserRole.ADMIN
      ) {
        client.emit('error', { message: 'Access denied to this conversation' });
        return;
      }

      client.conversationId = data.conversationId;
      client.join(`conversation_${data.conversationId}`);
      
      // Mark messages as read
      if (client.userRole === UserRole.USER) {
        await this.chatService.markMessagesAsRead(data.conversationId, client.userId);
      }

      client.emit('joinedConversation', { conversationId: data.conversationId });
      
    } catch (error) {
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto & { conversationId: string },
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data.conversationId,
        client.userId,
        data,
      );

      // Emit to all users in the conversation
      this.server.to(`conversation_${data.conversationId}`).emit('newMessage', message);
      
      // Notify admins if message is from customer
      if (client.userRole === UserRole.USER) {
        this.server.to('admins').emit('newCustomerMessage', {
          conversationId: data.conversationId,
          message,
        });
      }

    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!this.typingUsers.has(data.conversationId)) {
      this.typingUsers.set(data.conversationId, new Set());
    }

    const typingSet = this.typingUsers.get(data.conversationId);

    if (data.isTyping) {
      typingSet.add(client.userId);
    } else {
      typingSet.delete(client.userId);
    }

    // Emit typing status to other users in conversation
    client.to(`conversation_${data.conversationId}`).emit('userTyping', {
      userId: client.userId,
      isTyping: data.isTyping,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    try {
      await this.chatService.markMessageAsRead(data.messageId, client.userId);
      
      // Notify other users in conversation
      client.to(`conversation_${data.conversationId}`).emit('messageRead', {
        messageId: data.messageId,
        readBy: client.userId,
        readAt: new Date(),
      });

    } catch (error) {
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }

  // Admin-specific events
  @SubscribeMessage('assignConversation')
  async handleAssignConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (client.userRole !== UserRole.ADMIN) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    try {
      const conversation = await this.chatService.assignConversation(
        data.conversationId,
        client.userId,
      );

      // Notify all admins about assignment
      this.server.to('admins').emit('conversationAssigned', {
        conversationId: data.conversationId,
        adminId: client.userId,
      });

      // Notify customer
      this.server.to(`user_${conversation.customerId}`).emit('adminAssigned', {
        conversationId: data.conversationId,
        adminId: client.userId,
      });

    } catch (error) {
      client.emit('error', { message: 'Failed to assign conversation' });
    }
  }

  @SubscribeMessage('closeConversation')
  async handleCloseConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (client.userRole !== UserRole.ADMIN) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    try {
      const conversation = await this.chatService.closeConversation(data.conversationId);

      // Notify all users in conversation
      this.server.to(`conversation_${data.conversationId}`).emit('conversationClosed', {
        conversationId: data.conversationId,
        closedBy: client.userId,
      });

    } catch (error) {
      client.emit('error', { message: 'Failed to close conversation' });
    }
  }

  // Utility method to get online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Method to send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit('notification', notification);
    }
  }
}