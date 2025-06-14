import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req,
  ) {
    return this.chatService.createConversation(req.user.id, createConversationDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  findUserConversations(@Request() req) {
    return this.chatService.findUserConversations(req.user.id, req.user.role);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation found' })
  findConversation(@Param('id') id: string) {
    return this.chatService.findConversation(id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  getConversationMessages(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.chatService.getConversationMessages(id, page, limit);
  }

  @Post('conversations/:id/assign')
  @ApiOperation({ summary: 'Assign conversation to admin' })
  @ApiResponse({ status: 200, description: 'Conversation assigned successfully' })
  assignConversation(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can assign conversations');
    }
    return this.chatService.assignConversation(id, req.user.id);
  }

  @Post('conversations/:id/close')
  @ApiOperation({ summary: 'Close conversation' })
  @ApiResponse({ status: 200, description: 'Conversation closed successfully' })
  closeConversation(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can close conversations');
    }
    return this.chatService.closeConversation(id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search conversations' })
  @ApiResponse({ status: 200, description: 'Search results' })
  searchConversations(
    @Query('q') query: string,
    @Request() req,
  ) {
    const adminId = req.user.role === UserRole.ADMIN ? req.user.id : undefined;
    return this.chatService.searchConversations(query, adminId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get conversation statistics' })
  @ApiResponse({ status: 200, description: 'Conversation statistics' })
  getStats(@Request() req) {
    const adminId = req.user.role === UserRole.ADMIN ? req.user.id : undefined;
    return this.chatService.getConversationStats(adminId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload file for chat' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/chat',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        // Allow images and common document types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
        const extName = allowedTypes.test(extname(file.originalname).toLowerCase());
        const mimeType = allowedTypes.test(file.mimetype);

        if (mimeType && extName) {
          return cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      fileName: file.originalname,
      fileUrl: `/uploads/chat/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  @Get('conversations/:id/export')
  @ApiOperation({ summary: 'Export conversation history' })
  @ApiResponse({ status: 200, description: 'Conversation history exported' })
  exportConversation(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can export conversations');
    }
    return this.chatService.exportConversationHistory(id);
  }

  // Template management endpoints
  @Post('templates')
  @ApiOperation({ summary: 'Create chat template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  createTemplate(@Body() createTemplateDto: CreateTemplateDto, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Only admins can create templates');
    }
    return this.chatService.createTemplate(createTemplateDto, req.user.id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all chat templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  findAllTemplates() {
    return this.chatService.findAllTemplates();
  }
}