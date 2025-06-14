import { IsEmail, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: ['user@example.com'], description: 'Array of recipient emails' })
  @IsArray()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiProperty({ example: 'Welcome to our platform!' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<h1>Welcome!</h1><p>Thank you for joining us.</p>' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiProperty({ example: 'Welcome! Thank you for joining us.' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ example: 'noreply@example.com' })
  @IsOptional()
  @IsEmail()
  from?: string;
}