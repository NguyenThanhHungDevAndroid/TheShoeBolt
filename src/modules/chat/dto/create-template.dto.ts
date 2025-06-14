import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Welcome Message' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Hello! Welcome to our support chat. How can I help you today?' })
  @IsString()
  content: string;
}