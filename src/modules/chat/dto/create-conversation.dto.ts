import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 'Need help with my order' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Hello, I need assistance with my recent order.' })
  @IsString()
  initialMessage: string;
}