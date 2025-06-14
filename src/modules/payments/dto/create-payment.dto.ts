import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 99.99, description: 'Payment amount in dollars' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'usd', default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Payment for premium subscription' })
  @IsOptional()
  @IsString()
  description?: string;
}