import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { SendEmailDto } from './dto/send-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Emails')
@Controller('emails')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  sendEmail(@Body() sendEmailDto: SendEmailDto) {
    return this.emailsService.sendEmail(sendEmailDto);
  }
}