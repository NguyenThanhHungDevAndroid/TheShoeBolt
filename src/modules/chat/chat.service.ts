import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { Message, MessageType } from './entities/message.entity';
import { ChatTemplate } from './entities/chat-template.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ChatTemplate)
    private templateRepository: Repository<ChatTemplate>,
  ) {}

  async createConversation(
    customerId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    // Check if customer already has an active conversation
    const existingConversation = await this.conversationRepository.findOne({
      where: {
        customerId,
        status: ConversationStatus.ACTIVE,
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    const conversation = this.conversationRepository.create({
      customerId,
      subject: createConversationDto.subject,
      status: ConversationStatus.ACTIVE,
    });

    const savedConversation = await this.conversationRepository.save(conversation);

    // Send initial message
    await this.sendMessage(savedConversation.id, customerId, {
      content: createConversationDto.initialMessage,
      type: MessageType.TEXT,
    });

    return savedConversation;
  }

  async findConversation(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['customer', 'admin'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async findUserConversations(userId: string, userRole: UserRole): Promise<Conversation[]> {
    const whereCondition = userRole === UserRole.ADMIN
      ? [{ adminId: userId }, { adminId: null }] // Admins can see assigned and unassigned conversations
      : { customerId: userId }; // Customers only see their own conversations

    return this.conversationRepository.find({
      where: whereCondition,
      relations: ['customer', 'admin'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      total,
    };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Message> {
    const conversation = await this.findConversation(conversationId);

    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content: sendMessageDto.content,
      type: sendMessageDto.type || MessageType.TEXT,
      fileName: sendMessageDto.fileName,
      fileUrl: sendMessageDto.fileUrl,
      fileSize: sendMessageDto.fileSize,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation's last message timestamp
    await this.conversationRepository.update(conversationId, {
      lastMessageAt: new Date(),
      unreadCount: () => 'unreadCount + 1',
    });

    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      { id: messageId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      { conversationId, senderId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    // Reset unread count for the conversation
    await this.conversationRepository.update(conversationId, {
      unreadCount: 0,
    });
  }

  async assignConversation(conversationId: string, adminId: string): Promise<Conversation> {
    const conversation = await this.findConversation(conversationId);

    await this.conversationRepository.update(conversationId, { adminId });

    // Send system message about assignment
    await this.sendMessage(conversationId, adminId, {
      content: 'Admin has joined the conversation',
      type: MessageType.SYSTEM,
    });

    return this.findConversation(conversationId);
  }

  async closeConversation(conversationId: string): Promise<Conversation> {
    const conversation = await this.findConversation(conversationId);

    await this.conversationRepository.update(conversationId, {
      status: ConversationStatus.CLOSED,
    });

    // Send system message about closure
    await this.sendMessage(conversationId, conversation.adminId, {
      content: 'Conversation has been closed',
      type: MessageType.SYSTEM,
    });

    return this.findConversation(conversationId);
  }

  async searchConversations(
    query: string,
    adminId?: string,
  ): Promise<Conversation[]> {
    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.customer', 'customer')
      .leftJoinAndSelect('conversation.admin', 'admin')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.subject ILIKE :query', { query: `%${query}%` })
      .orWhere('customer.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('customer.lastName ILIKE :query', { query: `%${query}%` })
      .orWhere('customer.email ILIKE :query', { query: `%${query}%` })
      .orWhere('messages.content ILIKE :query', { query: `%${query}%` });

    if (adminId) {
      queryBuilder.andWhere('conversation.adminId = :adminId', { adminId });
    }

    return queryBuilder
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  async getConversationStats(adminId?: string): Promise<any> {
    const queryBuilder = this.conversationRepository.createQueryBuilder('conversation');

    if (adminId) {
      queryBuilder.where('conversation.adminId = :adminId', { adminId });
    }

    const [
      totalConversations,
      activeConversations,
      closedConversations,
      unassignedConversations,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('conversation.status = :status', { status: ConversationStatus.ACTIVE }).getCount(),
      queryBuilder.clone().andWhere('conversation.status = :status', { status: ConversationStatus.CLOSED }).getCount(),
      this.conversationRepository.count({ where: { adminId: null, status: ConversationStatus.ACTIVE } }),
    ]);

    return {
      totalConversations,
      activeConversations,
      closedConversations,
      unassignedConversations,
    };
  }

  // Template management
  async createTemplate(createTemplateDto: CreateTemplateDto, createdById: string): Promise<ChatTemplate> {
    const template = this.templateRepository.create({
      ...createTemplateDto,
      createdById,
    });

    return this.templateRepository.save(template);
  }

  async findAllTemplates(): Promise<ChatTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateTemplate(id: string, updateData: Partial<ChatTemplate>): Promise<ChatTemplate> {
    await this.templateRepository.update(id, updateData);
    return this.templateRepository.findOne({ where: { id }, relations: ['createdBy'] });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.templateRepository.update(id, { isActive: false });
  }

  async exportConversationHistory(conversationId: string): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['customer', 'admin', 'messages', 'messages.sender'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        createdAt: conversation.createdAt,
        customer: {
          id: conversation.customer.id,
          email: conversation.customer.email,
          firstName: conversation.customer.firstName,
          lastName: conversation.customer.lastName,
        },
        admin: conversation.admin ? {
          id: conversation.admin.id,
          email: conversation.admin.email,
          firstName: conversation.admin.firstName,
          lastName: conversation.admin.lastName,
        } : null,
      },
      messages: conversation.messages.map(message => ({
        id: message.id,
        content: message.content,
        type: message.type,
        sender: {
          id: message.sender.id,
          email: message.sender.email,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
        },
        createdAt: message.createdAt,
        fileName: message.fileName,
        fileUrl: message.fileUrl,
      })),
    };
  }
}