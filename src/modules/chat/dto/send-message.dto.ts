import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello, how can I help you?' })
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiProperty({ example: 'document.pdf' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ example: 'https://example.com/files/document.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({ example: 1024 })
  @IsOptional()
  fileSize?: number;
}